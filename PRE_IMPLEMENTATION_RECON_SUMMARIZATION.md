# Pre-Implementation Recon Summary

## Scope

This recon focused on the async stabilization path in `ngx-testbox/testing`, specifically why zoneless async tests can miss delayed work such as `debounceTime(300)` before the first HTTP request is issued.

The immediate motivating case is the zoneless async `HeroSearchComponent` spec in `tour-of-heroes`.

## What We Changed Before This Recon Point

- Split `tour-of-heroes` component specs into `sync/` and `async/` folders.
- Converted the new async copies to `runTasksUntilStableAsync` plus `predefinedHttpCallInstructionsAsync`.
- Added zoneless TestBed setup to the async spec copies with `provideZonelessChangeDetection()`.
- Added component-side error handling in several `tour-of-heroes` components so real HTTP 500 responses do not become uncaught async test failures.

## Current Problem Statement

After enabling zoneless TestBed for the async specs, the async `HeroSearchComponent` tests fail when the spec relies on `runTasksUntilStableAsync(...)` to observe the debounced search request.

Observed failure pattern:

- The spec triggers an input event.
- The component schedules a `debounceTime(300)` timer.
- No HTTP request exists yet at the start of async stabilization.
- `runTasksUntilStableAsync` sees `requests.length === 0 && fixture.isStable()` and resolves immediately.
- The HTTP instruction remains unused, causing `HttpInstructionWasNotExecutedDuringFixtureStabilizationError`.

This means the current async helper is not timer-aware enough for zoneless delayed work that happens before the first HTTP request exists.

## Relevant Files And Roles

### Library async stabilization

- `projects/ngx-testbox/testing/src/run-tasks-until-stable-async.ts`
  - Main async stabilization entry point.
  - Calls `fixture.detectChanges()`.
  - Creates the long-run timeout.
  - Owns the recursive `runTasks(...)` loop.
  - Currently resolves early when there are no queued HTTP requests and `fixture.isStable()` is true.

- `projects/ngx-testbox/testing/src/internals/requests-passage-async.ts`
  - Passes queued requests in timeline/delay order.
  - Uses `advanceTimers(delay)` when provided.
  - Otherwise waits with real `setTimeout` for instruction-defined delays.
  - Only advances time once requests are already known to the mediator.

- `projects/ngx-testbox/testing/src/internals/get-requests-from-queue.ts`
  - Returns every currently queued `HttpTestingController` request.
  - Important limitation: it can only see requests that already exist.

- `projects/ngx-testbox/testing/src/internals/patch-set-interval.ts`
  - Debug-only patch that warns about `setInterval`.
  - Existing evidence that the library already treats timers as relevant to stabilization, but only in a limited debug capacity.

- `projects/ngx-testbox/testing/src/public_api.ts`
  - Exposes `runTasksUntilStableAsync` publicly.
  - Any API-shape change to async stabilization should be considered carefully because this is consumer-facing.

### Reproduction / motivating case

- `projects/tour-of-heroes/src/app/hero-search/hero-search.component.ts`
  - `heroes$` is built from `searchTerms.pipe(debounceTime(300), distinctUntilChanged(), switchMap(...))`.
  - The HTTP request is created only after the debounce timer fires.

- `projects/tour-of-heroes/src/app/hero-search/async/hero-search.component.spec.ts`
  - Async + zoneless reproduction case.
  - The user removed the explicit `waitForSearchDebounce` helper because the expectation is that the library should handle this class of delayed work.
  - Without that explicit wait, the spec fails because the HTTP instruction is never observed during stabilization.

## Current Behavior

### `runTasksUntilStableAsync`

Current high-level flow:

1. Clone and validate HTTP instructions.
2. Optionally patch `setInterval` in debug mode.
3. Create `RequestsPassageMediatorAsync`.
4. Call `fixture.detectChanges()`.
5. Start `runTasks(...)`.
6. Inside `runTasks(...)`:
   - Read queued HTTP requests.
   - If no requests exist and `fixture.isStable()` is true, resolve immediately.
   - Otherwise collect matching instructions and flush requests.
   - Recurse with `setTimeout(() => runTasks(...))` if still not done.

The important behavior gap is that "no requests yet" is treated as "nothing else will happen," which is not valid for delayed async work in zoneless mode.

### `RequestsPassageMediatorAsync`

The mediator can advance time only for already-known HTTP instructions.

It does not help with:

- a component timer that has not yet produced a request
- any macrotask that exists before the first request reaches `HttpTestingController`

### `HeroSearchComponent` zoneless async case

Data flow:

1. Input event calls `search(term)`.
2. `searchTerms.next(term)` emits synchronously.
3. `debounceTime(300)` delays the stream.
4. After 300ms, `switchMap(...)` calls `HeroService.searchHeroes(term)`.
5. Only then does the HTTP request appear in `HttpTestingController`.

Because step 4 happens later, the current async stabilizer exits too early.

## Most Likely Root-Cause Locations

Primary root cause:

- `projects/ngx-testbox/testing/src/run-tasks-until-stable-async.ts`
  - Early termination condition at the start of `runTasks(...)`.
  - Same assumption appears again later in the loop.

Secondary supporting area:

- The async approach has no internal tracking of pending timers, even though timer-based work can be a valid part of user flows before any HTTP exists.

## Caller / Usage Map

- `runTasksUntilStableAsync` is a public testing API and is already used in:
  - internal library async tests under `projects/ngx-testbox/src/__tests__/async/`
  - `tour-of-heroes` async integration specs

- Delayed requests are currently supported only once a request has already been matched to an instruction.

- There is no current mechanism for "wait until timers that may produce future requests have settled" outside of hand-written waits in specs.

## Constraints And Gotchas

### Angular / zoneless behavior

- `provideZonelessChangeDetection()` makes the async specs more production-like for zoneless apps.
- Under zoneless mode, generic timer behavior is not automatically represented by `fixture.isStable()` in the way the current helper assumes.
- Angular emits `NG0914` warnings because the workspace still loads `zone.js`; this does not block the zoneless TestBed setup, but it means the environment is mixed rather than fully zone-free.

### Library behavior constraints

- The async helper must continue to work for both zoneful and zoneless apps.
- The helper already has a public `advanceTimers` option, so any timer-tracking design should account for fake-timer environments.
- The long-run timeout behavior (`LongRunningComponentError`) must remain the safety net.
- Existing async tests that do not involve pre-request timers should not become much slower.
- The helper should not become search-specific or RxJS-specific.

### Design gotcha

- Polling for requests after an empty pass is simpler, but it is heuristic and can slow all async tests.
- Tracking pending timers is more robust, but requires temporarily patching global timer APIs during stabilization and restoring them correctly.
- Debug mode currently patches only `setInterval`; a real fix likely needs broader timer awareness than the current debug helper.

## Best Current Interpretation

The failure is not caused by bad HTTP instruction matching.

It is caused by a stabilization assumption:

- "No queued HTTP requests + stable fixture" does not necessarily mean "nothing else can still happen" in async zoneless flows.

For delayed work like `debounceTime(300)`, the library needs visibility into pending timers before concluding stabilization is complete.

## Open Questions

1. Should pending timer tracking be entirely internal to `runTasksUntilStableAsync`, or should any part of it be exposed as public configuration?
2. Should the implementation track only `setTimeout`, or both `setTimeout` and `setInterval`?
3. How should timer tracking interact with the existing `advanceTimers` option?
4. Should the helper resolve only when there are no queued HTTP requests, the fixture is stable, and no tracked timers remain?
5. If timers are tracked, should the helper also remember the soonest due timer and use that to schedule the next stabilization pass efficiently?
6. Is the existing debug-only `patchSetInterval()` best extended into a more general timer tracker, or should a separate internal utility be introduced?
7. How much extra overhead is acceptable for async tests that have no delayed timers at all?

## Suggested Starting Point For Planning

The most likely implementation target is `runTasksUntilStableAsync`, with a new internal timer-tracking utility that is active for the duration of one stabilization call.

The expected end-state behavior would be:

- the helper does not resolve while tracked timers that may still produce work are pending
- debounced HTTP requests become visible without hand-written waits in specs
- existing async HTTP delay/timeline behavior continues to work
- the long-run timeout still terminates genuinely non-settling cases
