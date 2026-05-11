# Plan: Code Implementation for Zoneless Support

## 1. Current behavior analysis

The library currently provides a synchronous testing workflow centered around Zone.js:

- **`runTasksUntilStable`** (in `run-tasks-until-stable.ts`) is the core orchestrator. It runs inside `fakeAsync` and synchronously loops while calling:
  - `fixture.detectChanges()`
  - `passTime(iterationMs)` which wraps `tick()` and `flushMicrotasks()`
  - `completeHttpCalls()` to flush queued HTTP requests via `HttpTestingController`
  - `fixture.isStable()` to determine if the Zone is stable
- **`passTime`** (in `pass-time.ts`) explicitly depends on `tick()` and `flushMicrotasks()` from `@angular/core/testing`, both of which require Zone.js.
- **`completeHttpCalls`** and **`DebugElementHarness`** are already zone-agnostic and work with raw DOM / `HttpTestingController`.
- **`predefinedHttpCallInstructions`** are pure data structures and are zone-agnostic.
- Example tests in `tour-of-heroes` wrap every test in `fakeAsync(() => { ... })` and call `runTasksUntilStable` synchronously.
- The `public_api.ts` exports `passTime` and `runTasksUntilStable` as primary APIs.

## 2. Desired behavior

After the change, the library must support Angular zoneless applications while preserving backward compatibility for existing Zone.js users:

- A new **`runTasksUntilStableAsync`** function must be available as the primary integration-testing helper for zoneless environments. It must:
  - Use `await fixture.whenStable()` instead of a synchronous `while (!fixture.isStable())` loop.
  - Explicitly flush HTTP requests via `completeHttpCalls()` between stability waits.
  - Support chained HTTP calls (one flush triggering another request) via an async loop.
  - Offer an optional **`advanceTimersBy`** callback parameter so users can plug in their test runner's fake timers (Jasmine, Vitest, etc.) to handle debounce / `setTimeout` without Zone.js.
- `runTasksUntilStable` must continue to exist and function unchanged for existing users.
- `passTime` must be **deprecated** (not removed) with JSDoc annotations indicating it requires Zone.js and is not suitable for zoneless testing.
- Example tests in the repo must demonstrate both the old synchronous API and the new async API.
- The library must not gain a direct dependency on Vitest or Jasmine.

## 3. Gap analysis

| Capability | Current State | Desired State | Gap |
|------------|---------------|---------------|-----|
| Async stabilization loop | Synchronous `while` + `tick()` | `async/await` + `fixture.whenStable()` | Needs new async core function |
| Time control for debounce | `passTime()` (Zone.js) | Caller-provided `advanceTimersBy` callback | Needs new parameter interface |
| Test runner agnostic timers | N/A (Zone.js handles everything) | User-injected callback | Needs design decision on adapter pattern |
| Backward compatibility | All APIs active | Old APIs preserved, new APIs added | Must not break existing imports |
| Reactive forms input simulation | Direct nativeElement mutation | May need `dispatchEvent('input')` for zoneless CD | Minor harness enhancement |
| Public API surface | `runTasksUntilStable`, `passTime` | Add `runTasksUntilStableAsync`, deprecate `passTime` | Export changes needed |

## 4. Detailed implementation steps

### Step 4.1: Add `advanceTimersBy` to parameter interfaces

**File:** `projects/ngx-testbox/testing/src/run-tasks-until-stable.ts`

- Modify `RunTasksUntilStableParams` to include:
  ```typescript
  export interface RunTasksUntilStableParams {
    iterationMs?: number;
    httpCallInstructions?: HttpCallInstruction[];
    /** Optional callback to advance fake timers (Jasmine, Vitest, etc.) */
    advanceTimersBy?: (ms: number) => void | Promise<void>;
  }
  ```
- Ensure the type is exported so consumer tests can reference it.

### Step 4.2: Implement `runTasksUntilStableAsync`

**File:** `projects/ngx-testbox/testing/src/run-tasks-until-stable.ts`

- Create a new exported function:
  ```typescript
  export async function runTasksUntilStableAsync(
    fixture: ComponentFixture<unknown>,
    params: RunTasksUntilStableParams = {}
  ): Promise<void> { ... }
  ```
- Internally it should:
  1. Call `fixture.detectChanges()` to kick off lifecycle hooks.
  2. Instantiate HTTP call trackers (reuse existing `trackRequiredHttpInstructionsToInvoke`).
  3. Loop up to `MAXIMUM_ATTEMPTS`:
     - `await fixture.whenStable()`.
     - If `advanceTimersBy` is provided, call it with `iterationMs` (default 1000) and `await` if it returns a Promise.
     - Get pending requests via `getRequestsFromQueue()`.
     - If requests exist, call `completeHttpCalls()` with the tracked instructions.
     - Call `fixture.detectChanges()` after flushing.
     - Re-check queue. If empty, break.
  4. After the loop, call `throwIfThereIsHttpInstructionNotInvoked()`.
  5. Do **not** include `patchSetInterval` — it is irrelevant in zoneless mode.

### Step 4.3: Deprecate `passTime`

**File:** `projects/ngx-testbox/testing/src/pass-time.ts`

- Add `@deprecated` JSDoc:
  ```typescript
  /**
   * @deprecated This function requires Zone.js (`tick`/`flushMicrotasks`).
   * It does not work in zoneless applications. Use your test runner's fake timers
   * (e.g., `jasmine.clock().tick()`, `vi.advanceTimersByTime()`) instead.
   */
  export const passTime = ...
  ```
- Do **not** change the implementation; preserve existing behavior.

### Step 4.4: Update `public_api.ts`

**File:** `projects/ngx-testbox/testing/src/public_api.ts`

- Ensure `runTasksUntilStableAsync` is exported.
- Keep `runTasksUntilStable` and `passTime` exports unchanged.

### Step 4.5: Enhance `DebugElementHarness` for zoneless reactive forms (optional but recommended)

**File:** `projects/ngx-testbox/testing/src/debug-element-harness.ts`

- In methods that interact with inputs (currently the base class only offers `click`, `focus`, `getTextContent`; component-specific harnesses in examples handle `setValue`), consider whether any base helper should dispatch events.
- **Decision:** Keep `DebugElementHarness` minimal. Event dispatch belongs in component-specific harnesses or user test code. No change to `DebugElementHarness.ts`.

### Step 4.6: Migrate example tests to demonstrate new API

**Files:**
- `projects/tour-of-heroes/src/app/heroes/heroes.component.spec.ts`
- `projects/tour-of-heroes/src/app/hero-search/hero-search.component.spec.ts`
- `projects/tour-of-heroes/src/app/hero-detail/hero-detail.component.spec.ts`

- Add `provideZonelessChangeDetection()` to at least one test module configuration to prove zoneless works.
- Convert a subset of tests (e.g., one `describe` block per spec file) from `fakeAsync` to `async` using `runTasksUntilStableAsync`.
- Keep existing `fakeAsync` tests intact to prove backward compatibility.
- For tests involving debounce (e.g., `hero-search`), show `advanceTimersBy` usage with Jasmine clock.

### Step 4.7: Add unit tests for `runTasksUntilStableAsync`

**File:** `projects/ngx-testbox/src/__tests__/run-tasks-until-stable-async.spec.ts` (new)

- Port the core test scenarios from `run-tasks-until-stable.spec.ts` to async equivalents:
  - Sequential HTTP calls are flushed and resolved.
  - Missing HTTP instructions throw.
  - Unhandled HTTP requests throw.
  - `advanceTimersBy` is invoked during stabilization.
- Configure TestBed with `provideZonelessChangeDetection()`.

## 5. Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Existing `fakeAsync` tests break due to accidental shared state | High | Do not modify `runTasksUntilStable` implementation. Keep old code paths untouched. |
| `fixture.whenStable()` resolves before debounced HTTP is queued, causing flaky tests in zoneless | Medium | Document that users must provide `advanceTimersBy` when testing debounced inputs. Add explicit examples. |
| Infinite async loops if chained HTTP never empties the queue | Medium | Reuse `MAXIMUM_ATTEMPTS`; throw `MaximumAttemptsToStabilizeFixtureReachedError` just like the sync version. |
| Users confuse when to use sync vs async API | Low | Update docs to clearly label zoneless vs legacy APIs. Use `Async` suffix in function name. |
| Bundle size / tree-shaking concerns from extra export | Very Low | The new function is tiny and shares internal helpers with the sync version. |

## 6. Success criteria

- [ ] `runTasksUntilStableAsync` is exported and compiles without errors.
- [ ] A zoneless TestBed test (with `provideZonelessChangeDetection()`) passes using `runTasksUntilStableAsync` + `completeHttpCalls`.
- [ ] The same test fails if `fakeAsync` is used instead (proving zoneless path is distinct).
- [ ] Existing `fakeAsync` tests in `tour-of-heroes` still pass without modification.
- [ ] `passTime` shows a deprecation warning in IDEs due to `@deprecated` JSDoc.
- [ ] At least one example spec demonstrates `advanceTimersBy` with Jasmine fake timers.
- [ ] All internal shared helpers (`trackRequiredHttpInstructionsToInvoke`, `throwIfThereIsHttpInstructionNotInvoked`) remain unchanged.

## 7. Testing strategy

### Unit tests for the library
- Create `run-tasks-until-stable-async.spec.ts` next to the existing sync spec.
- Use `TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] })`.
- Cover:
  - Happy path: single HTTP flush.
  - Chained HTTP: first flush triggers a second request.
  - Timer advancement: verify `advanceTimersBy` callback is called with the expected `ms`.
  - Error paths: unhandled request, unused instruction.

### Integration tests (tour-of-heroes)
- Select one representative test per component spec and convert it to `async`:
  - `heroes.component.spec.ts`: "should add new hero when valid name is entered"
  - `hero-search.component.spec.ts`: "should show heroes when search term matches"
  - `hero-detail.component.spec.ts`: "should save hero and navigate back"
- Run the full existing test suite to ensure zero regressions in `fakeAsync` paths.

### Manual verification
- Temporarily remove `zone.js` from `angular.json` polyfills and confirm the new async tests still pass while old `fakeAsync` tests fail (as expected) or are skipped.
- Verify the deprecation annotation appears in IDE tooltips for `passTime`.
