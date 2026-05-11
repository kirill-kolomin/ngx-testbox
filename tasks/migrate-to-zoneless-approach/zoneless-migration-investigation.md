# Zoneless Migration Investigation for ngx-testbox

## Executive Summary

**Yes, ngx-testbox can be adapted for zoneless Angular applications.** The core concepts (HTTP call instructions, debug-element harnesses, black-box testing) remain valid. However, the **synchronous `fakeAsync`-based execution model must be replaced with a native `async/await` model** because `fakeAsync`, `tick`, and `flushMicrotasks` require Zone.js.

The good news is that Angular's zoneless testing APIs (`await fixture.whenStable()`) combined with `HttpTestingController` can reproduce the same user-like step-by-step behavior. The library needs a new async core function instead of `runTasksUntilStable`.

---

## 1. How ngx-testbox works today (Zone.js based)

| Feature | Current Implementation | Zone.js dependency |
|---------|----------------------|-------------------|
| **Core orchestrator** | `runTasksUntilStable` | Heavy |
| **Time control** | `passTime` wraps `tick()` + `flushMicrotasks()` | Heavy |
| **Stability detection** | `fixture.isStable()` inside `fakeAsync` loop | Moderate |
| **HTTP mocking** | `completeHttpCalls` + `HttpTestingController` | None |
| **DOM harness** | `DebugElementHarness` | None |
| **Test directive** | `TestIdDirective` | None |

### Current test flow (synchronous)

```typescript
it('should add hero', fakeAsync(() => {
  harness.elements.addButton.click();
  runTasksUntilStable(fixture, {
    httpCallInstructions: [postHeroSuccess()]
  });
  expect(harness.elements.heroItem.queryAll().length).toBe(1);
}));
```

What happens under the hood:
1. `fakeAsync` patches all async APIs (promises, timers, HTTP).
2. `runTasksUntilStable` loops, calling `fixture.detectChanges()`, `passTime()` (which calls `tick()`), and `completeHttpCalls()`.
3. `fixture.isStable()` returns `true` when the Zone has no pending microtasks/macrotasks.
4. The test proceeds **synchronously** to the next line.

---

## 2. Zoneless Angular testing fundamentals

### 2.1 Zoneless is the future default

- **Angular v21+**: Zoneless is the default. `provideZonelessChangeDetection()` is implicit.
- **Angular v20**: Must explicitly add `provideZonelessChangeDetection()`.
- Zone.js must be removed from `angular.json` polyfills and uninstalled: `npm uninstall zone.js`.

### 2.2 What breaks without Zone.js

| API | Status in zoneless | Replacement |
|-----|-------------------|-------------|
| `fakeAsync` | **Does not work** | Native `async/await` |
| `tick()` | **Does not work** | Test-runner fake timers (Jasmine/Vitest) or real waits |
| `flushMicrotasks()` | **Does not work** | `await fixture.whenStable()` |
| `fixture.isStable()` | Works, semantics change | Still usable, but driven by `PendingTasks`, not Zone |
| `fixture.whenStable()` | **Primary tool** | `await fixture.whenStable()` |
| `fixture.detectChanges()` | Works, but discouraged | Prefer letting Angular schedule CD |
| `HttpTestingController` | **Fully works** | Same API |

### 2.3 How stability works in zoneless

In zoneless mode, `fixture.isStable()` / `fixture.whenStable()` rely on Angular's internal **`PendingTasks`** service rather than Zone.js tracking.

Angular automatically registers pending tasks for:
- `HttpClient` requests
- `Router` navigations
- `PendingTasks.run(...)` blocks

This means **if you flush an HTTP request with `HttpTestingController`, the pending task is removed, and `fixture.whenStable()` will resolve.**

---

## 3. Key insight: `HttpTestingController` still works in zoneless

The `HttpTestingController` does **not** depend on Zone.js. It intercepts `HttpClient` requests at the backend level.

However, in zoneless tests you **must flush explicitly**; there is no automatic synchronous flush like in `fakeAsync`. The pattern becomes:

```typescript
// 1. Trigger action that causes HTTP
harness.elements.searchButton.click();
await fixture.whenStable(); // wait until request is queued

// 2. Flush the request manually
const req = httpTestingController.expectOne('/api/heroes');
req.flush(mockHeroes);

// 3. Wait for component to process the response
await fixture.whenStable();

// 4. Assert DOM
expect(harness.elements.heroItem.queryAll().length).toBe(3);
```

---

## 4. Migration strategies

### Strategy A: Native async/await with explicit HTTP flushing (Recommended)

Replace the synchronous `fakeAsync` + `runTasksUntilStable` flow with explicit async steps. This gives the same "click -> wait -> assert -> click -> wait" behavior, just using `async/await` instead of synchronous blocking.

**Before (zone.js):**
```typescript
it('should search', fakeAsync(() => {
  harness.setSearchBoxValue('ma');
  runTasksUntilStable(fixture, {
    httpCallInstructions: [getHeroesSearchSuccess()]
  });
  expect(harness.getHeroElements().length).toBeGreaterThan(0);
}));
```

**After (zoneless):**
```typescript
it('should search', async () => {
  harness.setSearchBoxValue('ma');

  // Wait for the debounce/setTimeout/input handling to queue the HTTP request
  await fixture.whenStable();

  // Flush the HTTP request(s)
  completeHttpCalls([getHeroesSearchSuccess()]);

  // Wait for the component to process the response and re-render
  await fixture.whenStable();

  expect(harness.getHeroElements().length).toBeGreaterThan(0);
});
```

**Pros:**
- True to how the browser actually works.
- No magic loops or fake time.
- Compatible with all zoneless Angular apps.

**Cons:**
- More verbose than the current `runTasksUntilStable` single-call.
- Tests must be `async`.

### Strategy B: Async `runTasksUntilStable` helper (Library evolution)

Create an async version of `runTasksUntilStable` that hides the `await fixture.whenStable()` + `completeHttpCalls` + `await fixture.whenStable()` boilerplate.

**Conceptual implementation:**

```typescript
export async function runTasksUntilStableAsync(
  fixture: ComponentFixture<unknown>,
  params: RunTasksUntilStableParams = {}
): Promise<void> {
  const { httpCallInstructions = [] } = params;
  const httpTestingController = TestBed.inject(HttpTestingController);

  // Track required HTTP instructions
  const { callTrackers, requiredHttpCallInstructions } =
    trackRequiredHttpInstructionsToInvoke(httpCallInstructions);

  // Trigger initial change detection / ngOnInit
  fixture.detectChanges();

  // In zoneless, we can't loop on fixture.isStable() synchronously.
  // Instead, we wait for stability, then flush HTTP, then wait again.
  // Angular v20+ PendingTasks will mark the fixture unstable while
  // HttpClient requests are in flight.
  let attempts = 0;
  let requests = getRequestsFromQueue(httpTestingController);

  do {
    if (attempts++ > MAXIMUM_ATTEMPTS) {
      throw new MaximumAttemptsToStabilizeFixtureReachedError(MAXIMUM_ATTEMPTS);
    }

    // Wait for Angular to reach a stable state (or at least queue the request)
    await fixture.whenStable();

    // Flush any queued HTTP requests
    if (requests.length > 0) {
      completeHttpCalls(requiredHttpCallInstructions, { testRequests: requests });
      fixture.detectChanges();
    }

    requests = getRequestsFromQueue(httpTestingController);
  while (requests.length > 0);

  throwIfThereIsHttpInstructionNotInvoked(callTrackers);
}
```

**Usage:**
```typescript
it('should search', async () => {
  harness.setSearchBoxValue('ma');
  await runTasksUntilStableAsync(fixture, {
    httpCallInstructions: [getHeroesSearchSuccess()]
  });
  expect(harness.getHeroElements().length).toBeGreaterThan(0);
});
```

**Open questions for this approach:**
1. **Debounced inputs**: If the component uses `setTimeout` for debounce (e.g., RxJS `debounceTime`), `fixture.whenStable()` may resolve **before** the HTTP request is queued, because `setTimeout` is not a pending task in zoneless unless wrapped in `PendingTasks.run()`. You may need to use your test runner's fake timers (e.g., `jasmine.clock().tick()`) to advance time.
2. **Chained HTTP calls**: If one HTTP response triggers another HTTP request, a single `await fixture.whenStable()` might not be enough. You may need a small retry loop or multiple `whenStable()` calls.

### Strategy C: Test-runner fake timers + zoneless

You can combine zoneless change detection with **Jasmine/Vitest fake timers** to control time-based logic (debounce, `setTimeout`, `setInterval`) without Zone.js.

**Example with Jasmine:**
```typescript
beforeEach(() => {
  jasmine.clock().install();
});

afterEach(() => {
  jasmine.clock().uninstall();
});

it('should debounce search', async () => {
  harness.setSearchBoxValue('ma');
  jasmine.clock().tick(300); // advance debounce time

  await fixture.whenStable();
  completeHttpCalls([getHeroesSearchSuccess()]);
  await fixture.whenStable();

  expect(harness.getHeroElements().length).toBeGreaterThan(0);
});
```

**Angular docs recommendation:**
> "The use of `fakeAsync` is no longer recommended. Prefer using native async testing strategies or other fake timers (also called mock clocks) like those from Vitest or Jasmine."

This suggests that using **native async + test-runner fake timers** is the officially blessed replacement for `fakeAsync`.

### Strategy D: CDK ComponentHarness (Alternative testing paradigm)

Angular CDK provides `ComponentHarness` and `HarnessLoader`, which are designed to work across testing environments (Karma, Protractor, TestBed, etc.).

Key features:
- `host.click()`, `host.sendKeys()` abstract DOM interaction.
- `waitForTasksOutsideAngular()` can wait for async work.

However, CDK harnesses are more focused on **individual component testing** and do not provide built-in HTTP mocking integration. They could be used as a replacement for `DebugElementHarness`, but would not solve the `runTasksUntilStable` problem directly.

---

## 5. Detailed analysis of ngx-testbox API surface

| API | Zoneless impact | Recommendation |
|-----|----------------|----------------|
| `runTasksUntilStable` | **Requires rewrite** | Create `runTasksUntilStableAsync` using `await fixture.whenStable()` + fake timers |
| `passTime` | **Non-functional** | Deprecate; direct users to Jasmine/Vitest fake timers |
| `completeHttpCalls` | **Works as-is** | No changes needed |
| `getRequestsFromQueue` | **Works as-is** | No changes needed |
| `predefinedHttpCallInstructions` | **Works as-is** | No changes needed |
| `DebugElementHarness` | **Works as-is** | No changes needed |
| `TestIdDirective` | **Works as-is** | No changes needed |

### 5.1 Critical code paths to change

**`run-tasks-until-stable.ts`**
- Remove dependency on `passTime` (which uses `tick`/`flushMicrotasks`).
- Replace the synchronous `while (!fixture.isStable())` loop with an async loop using `await fixture.whenStable()`.
- Handle `setInterval` warnings differently (Jasmine fake timers don't need patching).

**`pass-time.ts`**
- This file becomes obsolete in zoneless. It should be deprecated or removed.

---

## 6. Step-by-step HTTP testing in zoneless: Proof of concept

The user's core requirement is:

> "When a user clicks a button then waits for http completion, then is able to fill an input, then clicks a button and waits for http again."

This is **absolutely possible** in zoneless. Here is a complete proof-of-concept test pattern:

```typescript
describe('HeroesComponent (zoneless)', () => {
  let fixture: ComponentFixture<HeroesComponent>;
  let harness: HeroesHarness;
  let httpTestingController: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeroesComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideZonelessChangeDetection() // force zoneless even if zone.js is loaded
      ]
    }).compileComponents();

    httpTestingController = TestBed.inject(HttpTestingController);
  });

  it('should add hero step by step', async () => {
    // --- Step 1: Initialize component ---
    fixture = TestBed.createComponent(HeroesComponent);
    harness = new HeroesHarness(fixture.debugElement);
    await fixture.whenStable(); // runs ngOnInit, triggers initial GET /api/heroes

    // Flush initial HTTP
    completeHttpCalls([
      predefinedHttpCallInstructions.get.success('/api/heroes', () => [])
    ]);
    await fixture.whenStable();

    expect(harness.elements.heroItem.queryAll().length).toBe(0);

    // --- Step 2: User fills input ---
    harness.setNameInputValue('Test Hero');
    // Input events may need dispatchEvent for ngModel to pick up in zoneless:
    const input = harness.elements.nameInput.query().nativeElement;
    input.dispatchEvent(new Event('input'));

    // --- Step 3: User clicks add button ---
    harness.elements.addButton.click();
    await fixture.whenStable(); // wait for POST /api/heroes to be queued

    // --- Step 4: Wait for HTTP and flush ---
    completeHttpCalls([
      predefinedHttpCallInstructions.post.success('/api/heroes', (req) => ({
        id: 1,
        name: (req.body as any).name,
        hp: 100,
        attack: 10
      }))
    ]);
    await fixture.whenStable(); // wait for component to process response and re-render

    // --- Step 5: Assert result ---
    expect(harness.elements.heroItem.queryAll().length).toBe(1);
    expect(harness.elements.heroName.getTextContent()).toContain('Test Hero');

    // --- Step 6: Verify no outstanding requests ---
    httpTestingController.verify();
  });
});
```

**Key observations from this PoC:**
1. Each user action (click, input) is followed by `await fixture.whenStable()`.
2. HTTP requests are flushed explicitly with `completeHttpCalls` (or `httpTestingController.expectOne().flush()`).
3. After flushing, another `await fixture.whenStable()` ensures the component has processed the response and updated the DOM.
4. The test reads exactly like user behavior, just with `await` between steps.

---

## 7. Open questions and risks

### 7.1 `fixture.whenStable()` may resolve before HTTP is queued

In zoneless, `HttpClient` requests are tracked as pending tasks. However, if there is a `setTimeout` (e.g., debounce) between the user click and the HTTP request, the `setTimeout` itself is **not** a pending task unless the code explicitly wraps it.

**Mitigation:**
- For debounced inputs, use Jasmine/Vitest fake timers: `jasmine.clock().tick(300)`.
- Or expose `runTasksUntilStableAsync` with an optional `advanceTimersBy` parameter that calls the test runner's fake timer API.

### 7.2 Multiple chained HTTP requests

If component A calls API 1, and in the success callback calls API 2, a single `await fixture.whenStable()` after flushing API 1 may not wait for API 2 to be queued.

**Mitigation:**
- The async helper should loop: `await fixture.whenStable()` -> `completeHttpCalls()` -> check if new requests appeared -> repeat.
- This is analogous to the current synchronous loop but using async awaits.

### 7.3 `setInterval` handling

The current library patches `setInterval` to warn about stabilization issues. In zoneless:
- `setInterval` does not affect `fixture.whenStable()` (it's not a pending task).
- The patch/warning is unnecessary in zoneless.
- However, `setInterval` callbacks that mutate state still need to call `markForCheck()` or use signals to trigger change detection.

### 7.4 Reactive forms in zoneless

Angular docs explicitly state:
> "Reactive forms model updates (`setValue`, `patchValue`, `FormArray.push`, and similar APIs) update form state and emit forms observables, but they do not automatically schedule component change detection."

This affects tests that programmatically set input values:
```typescript
// In zoneless, this alone may not trigger CD:
input.value = 'new value';
// You also need:
input.dispatchEvent(new Event('input'));
// And if the component uses reactive forms internally without signal binding,
// the component itself may need markForCheck().
```

**Impact on ngx-testbox:**
- `DebugElementHarness` methods that set values should probably dispatch events.
- This is already a best practice, but may become strictly required.

### 7.5 RxJS `toSignal` and `pendingUntilEvent`

If components use `toSignal()` or observables with `pendingUntilEvent()`, Angular's `PendingTasks` will track them. `fixture.whenStable()` will correctly wait for these to complete.

---

## 8. Recommended migration roadmap

### Phase 1: Dual-mode support (backward compatible)

1. **Create `runTasksUntilStableAsync`** as a new async alternative.
2. **Keep `runTasksUntilStable`** (zone.js version) for backward compatibility.
3. **Deprecate `passTime`** with a JSDoc note.
4. **Update `DebugElementHarness`** to optionally dispatch input events when setting values (to support reactive forms in zoneless).

### Phase 2: Zoneless-first test suite

1. Update `tour-of-heroes` example tests to use `runTasksUntilStableAsync`.
2. Document the pattern: native `async/await` + explicit `completeHttpCalls` + `await fixture.whenStable()`.
3. Provide examples using Jasmine/Vitest fake timers for debounce/time-based logic.

### Phase 3: Future cleanup

1. When Angular v21+ becomes the minimum supported version, consider making the async APIs the default.
2. Remove `passTime` and `fakeAsync` wrappers from examples.

---

## 9. References

- [Angular Zoneless Guide](https://angular.dev/guide/zoneless)
- [Angular Testing Utility APIs](https://angular.dev/guide/testing/utility-apis)
- [Component Testing Scenarios (whenStable)](https://angular.dev/guide/testing/components-scenarios#whenstable)
- [Angular `fakeAsync` API docs](https://angular.dev/api/core/testing/fakeAsync) - "This API requires Zone.js"
- [Angular `provideZonelessChangeDetection` API](https://angular.dev/api/core/provideZonelessChangeDetection)
