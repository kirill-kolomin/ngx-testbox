# Implementation Plan: Add Delays, onComplete, and Cancellation to Async Stabilization

## 1. Current Behavior Analysis

The `ngx-testbox` library provides two approaches for stabilizing Angular component fixtures during tests:

- **Sync approach (`runTasksUntilStable`)**: Works within `fakeAsync` / zone.js. Supports `delay`, `onCompleted`, and `willHaveBeenCancelled` via `HttpCallInstruction` extra params. Uses `RequestsPassageMediator` to batch requests by delay and flush them in order. Calls `onCompleted` immediately after flushing a batch.

- **Async approach (`runTasksUntilStableAsync`)**: Works with async/await (zoneless-friendly). Currently `HttpCallInstructionAsync` only supports `[checker, ResponseGetterAsync]` — no extra params. `advanceTimers` has signature `() => void | Promise<void>` and receives no delay information. There is no `RequestsPassageMediator` equivalent; `completeHttpCallsAsync` flushes all requests immediately without delay handling. `onCompleted` and `willHaveBeenCancelled` are not supported.

## 2. Desired Behavior

After the change, the async approach should have **feature parity** with the sync approach regarding HTTP instruction capabilities:

- `HttpCallInstructionAsync` supports an optional third tuple element: `{ delay?: number; onCompleted?: () => void; willHaveBeenCancelled?: boolean }`
- `advanceTimers` signature becomes `(delayMs: number) => void | Promise<void>`, receiving the delay value from the instruction
- If `advanceTimers` is not provided but delays exist, the system falls back to `await new Promise(r => setTimeout(r, delay))`
- Requests with the same delay are batched and flushed together (like sync `RequestsPassageMediator`)
- `onCompleted` is called immediately after its request batch is flushed, without waiting for `fixture.whenStable()`
- `willHaveBeenCancelled` marks the instruction as invoked when the request is cancelled, preventing "instruction not invoked" errors
- `completeHttpCallsAsync` is renamed to `collectHttpCallsAsync` and acts as a collector for a new `RequestsPassageMediatorAsync`

## 3. Gap Analysis

| Feature | Sync | Async (Current) | Async (Desired) |
|---|---|---|---|
| `delay` in instruction | Yes | No | Yes |
| `onCompleted` callback | Yes | No | Yes |
| `willHaveBeenCancelled` | Yes | No | Yes |
| Batched delay flushing | Yes (via `RequestsPassageMediator`) | No | Yes (via `RequestsPassageMediatorAsync`) |
| `advanceTimers` receives delay | N/A (uses `tick`) | No | Yes |
| Internal delay fallback | N/A | No | Yes (`setTimeout`) |
| Collector pattern | `collectHttpCalls` | `completeHttpCallsAsync` (direct flush) | `collectHttpCallsAsync` |

## 4. Detailed Implementation Steps

### Step 1: Update Type Definitions

**File:** `projects/ngx-testbox/testing/src/interfaces/http-call.ts`
- Change `HttpCallInstructionAsync` from `[HttpCallChecker, ResponseGetterAsync]` to `[HttpCallChecker, ResponseGetterAsync] | [HttpCallChecker, ResponseGetterAsync, HttpCallInstructionExtraParams]`

**File:** `projects/ngx-testbox/testing/src/internals/enriched-http-instruction.ts`
- `EnrichedHttpInstructionAsync` already supports the payload; no change needed

### Step 2: Create `RequestsPassageMediatorAsync`

**New file:** `projects/ngx-testbox/testing/src/internals/requests-passage-async.ts`
- Mirror `RequestsPassageMediator` logic but adapted for async:
  - `#requests: Record<number, [TestRequest, ResponseGetterAsync, EnrichedHttpInstructionPayload][]>`
  - `addRequest(...)` — same grouping logic by delay
  - `async passRequests(advanceTimers?)` — async method that:
    1. Finds the earliest delay batch
    2. If delay > 0: calls `advanceTimers(delay)` if provided, else `await new Promise(r => setTimeout(r, delay))`
    3. For each request in the batch: await `responseGetter`, flush response, collect `onCompleted` callbacks, handle `willHaveBeenCancelled`
    4. Returns `{shouldStabilizeAfterRequests: boolean, asserts?: OnCompleted[]}`
  - Does NOT throw `CannotUsePromiseResponseWithinFakeAsync` (not applicable)

### Step 3: Rename and Refactor `completeHttpCallsAsync` → `collectHttpCallsAsync`

**File:** `projects/ngx-testbox/testing/src/stabilize-fixture/async/complete-http-calls-async.ts` → `collect-http-calls-async.ts`
- Rename export function to `collectHttpCallsAsync`
- Change signature to accept `RequestsPassageMediatorAsync` instead of directly flushing
- Logic mirrors `collectHttpCalls` (sync):
  - Iterate requests
  - Skip cancelled
  - Find matching instruction
  - Call `requestsPassageMediator.addRequest(testRequest, responseGetter, options)`
- Remove direct `testRequest.flush(...)` logic (moved to mediator)

### Step 4: Update `runTasksUntilStableAsync`

**File:** `projects/ngx-testbox/testing/src/stabilize-fixture/async/run-tasks-until-stable-async.ts`
- Update `RunTasksUntilStableAsyncParams`:
  - `advanceTimers?: (delayMs: number) => void | Promise<void>`
- Import `RequestsPassageMediatorAsync` and `collectHttpCallsAsync`
- In `runTasks` function:
  - Create `const requestsPassageMediator = new RequestsPassageMediatorAsync(debug)`
  - Call `collectHttpCallsAsync(requiredHttpCallInstructions, requestsPassageMediator, {testRequests: requests})`
  - Replace `await completeHttpCallsAsync(...)` with:
    ```ts
    let passRequestsResult = await requestsPassageMediator.passRequests(advanceTimers);
    while (passRequestsResult.shouldStabilizeAfterRequests) {
      fixture.detectChanges();
      if (advanceTimers) { await advanceTimers(0); }
      await fixture.whenStable();
      fixture.detectChanges();
      await fixture.whenStable();
      passRequestsResult.asserts?.forEach((assert) => assert());
      collectHttpCallsAsync(...);
      passRequestsResult = await requestsPassageMediator.passRequests(advanceTimers);
    }
    ```
  - Keep existing stabilization loop after the while

### Step 5: Update Public API

**File:** `projects/ngx-testbox/testing/src/public_api.ts`
- Change `completeHttpCallsAsync` export to `collectHttpCallsAsync`
- Add export for `RequestsPassageMediatorAsync` (or keep internal if preferred — check if sync exports it; sync does not export `RequestsPassageMediator`, so keep async version internal too)
- Update `HttpCallInstructionAsync` type re-export if needed

### Step 6: Add / Update Tests

**Update:** `projects/ngx-testbox/src/__tests__/complete-http-calls-async.spec.ts` → `collect-http-calls-async.spec.ts`
- Update imports and function name
- Add tests for `onCompleted` and `willHaveBeenCancelled` handling via mediator

**Update:** `projects/ngx-testbox/src/__tests__/run-tasks-until-stable-async-http-response-delays.spec.ts`
- Change instructions to use `delay` param instead of Promise-based `setTimeout` in response getters
- Provide `advanceTimers` spy and verify it receives correct delay values
- Add test case without `advanceTimers` to verify internal `setTimeout` fallback

**New:** `projects/ngx-testbox/src/__tests__/run-tasks-until-stable-async-intermediate-asserts.spec.ts`
- Port `run-tasks-until-stable-intermediate-asserts.spec.ts` to async
- Verify `onCompleted` is called between batches and observes latest DOM state

**New:** `projects/ngx-testbox/src/__tests__/run-tasks-until-stable-async-country-race-and-cancellation.spec.ts`
- Port `run-tasks-until-stable-country-race-and-cancellation.spec.ts` to async
- Verify `willHaveBeenCancelled` prevents errors for race-cancelled requests
- Verify `onCompleted` assertions work with delayed responses

**Update:** `projects/ngx-testbox/src/__tests__/run-tasks-until-stable-async.spec.ts`
- Update `advanceTimers` test to verify new signature `(delayMs: number)`
- Add test for `onCompleted` callback
- Add test for `willHaveBeenCancelled`

### Step 7: Verify Example App

- Run `npm run test:coverage` to ensure no regressions in `tour-of-heroes` specs (they use sync approach, should be unaffected)

## 5. Risks

| Risk | Mitigation |
|---|---|
| Breaking change: `advanceTimers` signature change | This is an intentional API change. Update all internal tests. Check if any external consumers exist in the repo (tour-of-heroes does not use async approach). |
| Breaking change: `completeHttpCallsAsync` renamed | Update all imports in tests. Add re-export alias if backward compatibility is desired (discuss with user). |
| Async delay fallback makes tests slow | Document that `advanceTimers` is recommended for fast tests. The fallback is opt-in via not providing `advanceTimers`. |
| `RequestsPassageMediatorAsync` batching logic diverges from sync | Keep implementation as close as possible to sync version. Review side-by-side. |
| `onCompleted` timing differences between sync and async | Document that async `onCompleted` fires after the response is flushed and microtasks settle, but before `whenStable()`. |

## 6. Success Criteria

- [ ] `HttpCallInstructionAsync` accepts `[checker, getter, {delay, onCompleted, willHaveBeenCancelled}]`
- [ ] `advanceTimers` receives the delay value as a number argument
- [ ] `RequestsPassageMediatorAsync` batches requests by delay and flushes them in order
- [ ] `onCompleted` callbacks run immediately after their batch is flushed
- [ ] `willHaveBeenCancelled` marks instructions as invoked for cancelled requests
- [ ] Without `advanceTimers`, delays use real `setTimeout`
- [ ] All new async tests pass
- [ ] All existing tests (sync and async) pass without regression
- [ ] `npm run test:coverage` passes

## 7. Testing Strategy

1. **Unit tests for `RequestsPassageMediatorAsync`:**
   - Batching by delay
   - Ordered flushing
   - `onCompleted` collection
   - `willHaveBeenCancelled` handling
   - `advanceTimers` invocation with correct delay
   - Internal `setTimeout` fallback

2. **Integration tests for `runTasksUntilStableAsync`:**
   - Sequential delayed HTTP responses (port of sync delay test)
   - Intermediate assertions between delayed batches (port of sync intermediate asserts test)
   - Country race and cancellation (port of sync cancellation test)
   - Error cases: unused instruction, unhandled request

3. **Regression tests:**
   - Run full test suite (`npm run test:coverage`)
   - Verify `tour-of-heroes` specs still pass
   - Verify sync tests are untouched

4. **Manual verification:**
   - Check that `public_api.ts` exports are correct
   - Verify no TypeScript compilation errors
