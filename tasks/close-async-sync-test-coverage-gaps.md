# Plan: Close Async/Sync Test Coverage Gaps for User Scenarios

## 1. Current behavior analysis

The `ngx-testbox` library provides two stabilization APIs:
- **Sync (`fakeAsync`)**: `runTasksUntilStable` — synchronous, tick-based, supports intermediate assertions and race-condition testing.
- **Async**: `runTasksUntilStableAsync` — promise-based, uses real timers, supports `advanceTimers` hook.

The test suites for these APIs currently have **user-scenario coverage gaps**:

- **Sync-only scenarios** (no async equivalent):
  1. **Intermediate DOM assertions between sequential HTTP resolutions** — verifying UI state after the first HTTP call resolves but before the second finishes.
  2. **Time-precise user interaction & race conditions** — user changes a select at an exact timestamp while multiple delayed requests are in flight; tests request cancellation, loading-spinner toggles, and stale-response guards.
  3. **Never-stabilizing component detection** — component uses `setInterval` or perpetual timers; test verifies the library detects stabilization failure.

- **Async-only scenario** (no sync equivalent):
  1. **Nested dynamic tree from a genuinely async Promise response** — an HTTP mock returns a real `Promise` resolved via `setTimeout`, which then triggers a directive to dynamically create child components; those children issue further HTTP requests. The sync nested test uses immediate synchronous responses; the async version validates real async resolution during tree expansion.

- **Shared scenario with async friction**:
  1. **Form with async-loaded select + submit** — both approaches have a test, but the async version requires manual `await fixture.whenStable()`, `await fixture.whenRenderingDone()`, and an extra `setTimeout` workaround to assert rendered options.

## 2. Desired behavior

All user scenarios that are valid for both sync and async approaches should have **corresponding test coverage** in both `src/__tests__/sync/` and `src/__tests__/async/` (or the parent `__tests__/` for async counterparts).

Specifically:
- Async tests should cover: intermediate assertions, race/cancellation, never-stabilizing detection.
- Sync tests should cover: nested dynamic tree with genuinely delayed Promise responses.
- The async form+select test should be simplified to not require manual `whenStable`/`whenRenderingDone`/`setTimeout` workarounds.

## 3. Gap analysis

| # | Scenario | Sync Coverage | Async Coverage | Gap |
|---|----------|---------------|----------------|-----|
| 1 | Intermediate DOM assertions between HTTP resolutions | `run-tasks-until-stable-intermediate-asserts.spec.ts` | **Missing** | Async lacks intermediate-assertion pattern |
| 2 | Time-precise user interaction & race conditions | `run-tasks-until-stable-country-race-and-cancellation.spec.ts` | **Missing** | Async lacks race/cancellation/loading-state test |
| 3 | Never-stabilizing component detection | `run-tasks-until-stable.spec.ts` | **Missing** | Async lacks max-attempts / `setInterval` detection test |
| 4 | Nested dynamic tree with delayed Promise response | Uses immediate sync responses | `run-tasks-until-stable-async-nested-http.spec.ts` | Sync lacks delayed-Promise variant |
| 5 | Form with async-loaded select + submit | Clean single-call stabilization | Requires manual `whenStable`/`whenRenderingDone`/`setTimeout` | Async test is brittle and workaround-heavy |

## 4. Detailed implementation steps

### Step 4.1 — Add async intermediate-assertion test
- **Create**: `projects/ngx-testbox/src/__tests__/async/run-tasks-until-stable-async-intermediate-asserts.spec.ts`
- **Content**: Port the sync `IntermediateAssertsComponent` and test logic. Use `await runTasksUntilStableAsync(fixture, { httpCallInstructions })` with `onCompleted` callbacks to assert DOM state between request-passage cycles.
- **Constraint**: Must use real timers; do not use `fakeAsync`.

### Step 4.2 — Add async race/cancellation test
- **Create**: `projects/ngx-testbox/src/__tests__/async/run-tasks-until-stable-async-country-race-and-cancellation.spec.ts`
- **Content**: Port the sync `CountryRaceComponent` and test logic. Use `await runTasksUntilStableAsync(fixture, { httpCallInstructions })` with delayed instructions and `willHaveBeenCancelled`. Use `setTimeout` to simulate user changing the select at a specific real time.
- **Constraint**: Must validate loading-spinner toggles and stale-response guards under real async timing.

### Step 4.3 — Add async never-stabilizing detection test
- **Create**: `projects/ngx-testbox/src/__tests__/async/run-tasks-until-stable-async.spec.ts` (append to existing file or create new focused file)
- **Content**: Add a test where a component starts `setInterval` inside the Angular zone, then call `runTasksUntilStableAsync` with a short `componentLongRunTimeout`. Assert that the promise rejects with `MaximumAttemptsToStabilizeFixtureReachedError` (or the async equivalent timeout error).
- **Constraint**: Do not modify the sync test file.

### Step 4.4 — Add sync nested-dynamic-tree with delayed Promise response
- **Modify**: `projects/ngx-testbox/src/__tests__/sync/run-tasks-until-stable-fakeasync-nested-http.spec.ts`
- **Change**: Add a second `it` block where the first HTTP instruction (`/api/countries`) uses a response getter that returns a `Promise` resolved via `tick(200)` inside `fakeAsync`, rather than an immediate value. Keep the existing immediate-response test unchanged.
- **Constraint**: Must remain inside `fakeAsync`; use `tick()` to resolve the Promise.

### Step 4.5 — Simplify async form+select test
- **Modify**: `projects/ngx-testbox/src/__tests__/run-tasks-until-stable-async-resource-form-select.spec.ts`
- **Change**: Investigate why `await fixture.whenStable()`, `await fixture.whenRenderingDone()`, and the extra `setTimeout` are needed. If the async stabilization API is not fully flushing rendering, consider:
  - Adding an `await fixture.whenRenderingDone()` call inside `runTasksUntilStableAsync` (if appropriate and non-breaking), **or**
  - Updating the test to use `await runTasksUntilStableAsync(...)` followed by a single `await fixture.whenRenderingDone()` without the manual `setTimeout`.
- **Constraint**: Preserve the existing sync test behavior exactly.

## 5. Risks

| Risk | Mitigation |
|------|------------|
| Adding async race-condition tests may introduce flaky tests due to real timer non-determinism. | Use generous `componentLongRunTimeout` values and deterministic `delay` values; avoid relying on exact millisecond timing for assertions. |
| Modifying `runTasksUntilStableAsync` to auto-call `whenRenderingDone` could change behavior for existing consumers. | Only add auto-calls if the library design already implies full rendering flush; otherwise, keep the change in the test file only. |
| Sync `fakeAsync` Promise + `tick()` pattern may not perfectly mirror real async behavior. | Document that the sync test is a best-effort simulation; the async test remains the source of truth for real Promise delays. |
| Expanding test suite increases CI time. | Keep new tests focused; do not add redundant permutations. |

## 6. Success criteria

- [ ] `npm run test:coverage` passes with **zero** new failures.
- [ ] New async test files exist and cover scenarios 1, 2, 3 from the gap analysis.
- [ ] Sync nested-http test includes a delayed-Promise variant (scenario 4).
- [ ] Async form+select test no longer requires a manual `setTimeout` workaround (scenario 5).
- [ ] Code coverage for `projects/ngx-testbox/testing/src/stabilize-fixture/async/` does not decrease.

## 7. Testing strategy

1. **Local verification**: Run `npm run test:coverage` after each new test file is added.
2. **Pairwise review**: For each new async test, compare it side-by-side with its sync counterpart to ensure the same user scenario is exercised.
3. **Flakiness check**: Run the new async race-condition test in isolation at least 10 times (`npm test -- --include='...country-race...'` or equivalent Karma filter).
4. **Regression guard**: Confirm all existing `tour-of-heroes` example specs still pass.
