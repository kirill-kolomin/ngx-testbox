# ngx-testbox Concepts

## What ngx-testbox is for

`ngx-testbox` is a black-box Angular integration testing utility.

It is built around three ideas:

- Test user-visible behavior and DOM outcomes, not implementation details.
- Stabilize the fixture in a strict way so pending async work is either handled or surfaced as an error.
- Mock HTTP through declarative instructions rather than direct `HttpTestingController.expectOne(...)` calls.

Primary exports:

- Runtime entry point: `ngx-testbox`
  - `TestIdDirective`
- Testing entry point: `ngx-testbox/testing`
  - `runTasksUntilStable`
  - `runTasksUntilStableAsync`
  - `DebugElementHarness`
  - `predefinedHttpCallInstructions`
  - `predefinedHttpCallInstructionsAsync`
  - public HTTP instruction types and public error classes

## Both APIs are supported

Do not treat the synchronous API as deprecated behavior unless the library explicitly changes in the future.

Current support model:

- `runTasksUntilStableAsync`: preferred default for new tests, especially for zoneless apps and async response getters
- `runTasksUntilStable`: still a supported, eligible API for `fakeAsync`, `tick()`, and existing zone-based suites

Agent rule:

- prefer async mode by default for new work
- preserve or extend sync mode when the suite already uses `fakeAsync` or when virtual Angular time is the right fit

## Agent goals when using ngx-testbox

When implementing or editing tests, optimize for:

- Black-box coverage of real feature behavior.
- Deterministic completion of async flows.
- Minimal coupling to component internals.
- Clear test IDs and stable DOM queries.
- Complete HTTP instruction coverage: nothing missing, nothing unused.

Do not default to spying on private methods, forcing internal state, or asserting that methods were called unless the test explicitly needs white-box coverage.

## Decision rule: choose the right stabilization approach

There are two supported approaches.

### Async/await approach

Prefer `runTasksUntilStableAsync` plus `predefinedHttpCallInstructionsAsync` unless the test suite already depends on `fakeAsync` or you have a concrete reason to use virtual Angular time.

Use async mode when:

- Writing new tests.
- Testing zoneless Angular applications.
- You need async response getters that return a `Promise`.
- You want the most future-friendly path.

Key properties:

- Works in zoneful and zoneless Angular apps.
- Waits for real async completion via `fixture.whenStable()`.
- Supports optional `advanceTimers` for environments with fake timers.
- Throws `LongRunningComponentError` if the component does not settle within `componentLongRunTimeout`.

### Sync fakeAsync approach

Use `runTasksUntilStable` plus `predefinedHttpCallInstructions` when the suite already uses Angular `fakeAsync` and `tick()` heavily.

Use sync mode when:

- The surrounding spec already uses `fakeAsync`.
- You need deterministic virtual time with Angular's fakeAsync zone.
- The project is still built around `zone.js` testing patterns.

Key properties:

- Only for `fakeAsync` tests.
- Designed for zoneful Angular apps.
- Response getters must be synchronous.
- Throws `CannotUsePromiseResponseWithinFakeAsync` if a response getter returns a Promise.

## Strictness rules you must respect

ngx-testbox is intentionally strict. This is a feature, not a bug.

Expect failures in these situations:

- A request happens and no instruction matches it.
- You declared an instruction that never gets used.
- In sync mode, a response getter returns a Promise.
- In async mode, the fixture never settles before the timeout.
- In sync mode, the fixture never stabilizes within the internal attempt limit.
- `delay` and `timeline` are both provided on the same instruction.
- A `timeline` is already in the past when the request should be handled.

When a test fails under this strictness, fix the test or the feature behavior. Do not paper over it with broad matchers or extra unused instructions.

## Error reference agents should know

Public error classes exported from `ngx-testbox/testing`:

- `LongRunningComponentError`
- `MaximumAttemptsToStabilizeFixtureReachedError`
- `HttpInstructionWasNotExecutedDuringFixtureStabilizationError`
- `NoMatchingHttpInstructionForRequestFoundError`
- `HttpInstructionTimelineExceededError`
- `ConflictingHttpInstructionParamsError`
- `FailedToGenerateHttpResponseError`
- `CannotUsePromiseResponseWithinFakeAsync`
- `NoElementByTestIdFoundError`

How to interpret them:

- `NoMatchingHttpInstructionForRequestFoundError`: the component issued an unexpected request or the matcher is wrong.
- `HttpInstructionWasNotExecutedDuringFixtureStabilizationError`: you overdeclared instructions or the component did not reach the intended path.
- `LongRunningComponentError`: leaked timers, unresolved async, fake timers not advanced, or a genuinely long-running flow.
- `MaximumAttemptsToStabilizeFixtureReachedError`: sync fakeAsync stabilization never converged, commonly due to periodic timers.
- `CannotUsePromiseResponseWithinFakeAsync`: switch the test to async mode or make the getter synchronous.
- `ConflictingHttpInstructionParamsError`: remove either `delay` or `timeline`.
- `HttpInstructionTimelineExceededError`: your absolute ordering is impossible given earlier delays or timelines.
- `NoElementByTestIdFoundError`: the DOM does not contain the expected target at the moment the harness helper is invoked.
