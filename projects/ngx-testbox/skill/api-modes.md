# ngx-testbox API Modes

Load `async-approach.md` for async-first guidance and `sync-fakeasync-approach.md` for `fakeAsync` guidance. This file is only the shared API reference for instruction shapes and timing semantics.

## Stabilization APIs

Both stabilization APIs are supported parts of the library.

- `runTasksUntilStableAsync`: preferred default for new tests
- `runTasksUntilStable`: supported synchronous `fakeAsync` API for zone-based suites

Pick based on the suite and environment.

## Async API

```typescript
await runTasksUntilStableAsync(fixture, {
  httpCallInstructions,
  advanceTimers,
  componentLongRunTimeout,
  debug,
});
```

Parameters:

- `httpCallInstructions?: HttpCallInstructionAsync[]`
- `advanceTimers?: (delayMs: number) => void | Promise<void>`
- `componentLongRunTimeout?: number` default `10000`
- `debug?: boolean`

Use `advanceTimers` when your test runner has fake timers installed and delayed instructions would otherwise never advance.

Example:

```typescript
await runTasksUntilStableAsync(fixture, {
  httpCallInstructions: [
    predefinedHttpCallInstructionsAsync.get.success('/api/items', async () => mockItems),
  ],
  advanceTimers: (ms) => jasmine.clock().tick(ms),
});
```

## Sync API

```typescript
runTasksUntilStable(fixture, {
  httpCallInstructions,
  stabilizationTimeAdvance,
  maxAttempts,
  debug,
});
```

Parameters:

- `httpCallInstructions?: HttpCallInstruction[]`
- `stabilizationTimeAdvance?: number` default `0`
- `maxAttempts?: number` default `30`
- `debug?: boolean`

Important implementation detail:

`stabilizationTimeAdvance` is useful when Angular or the component schedules internal timers that need a push between stabilization rounds. Some flows need to wait for debounce or throttle timeouts, while others can rely on the default.

## HTTP instruction model

All HTTP behavior is driven by instructions. They are tuples.

### Sync type

```typescript
type HttpCallInstruction =
  | [HttpCallChecker, ResponseGetter]
  | [HttpCallChecker, ResponseGetter, HttpCallInstructionExtraParams];
```

### Async type

```typescript
type HttpCallInstructionAsync =
  | [HttpCallChecker, ResponseGetterAsync]
  | [HttpCallChecker, ResponseGetterAsync, HttpCallInstructionExtraParams];
```

### Checker forms

`HttpCallChecker` can be:

- a tuple: `[EndpointPath, HttpMethod]`
- a function: `(req) => boolean`

`EndpointPath` can be:

- `string`: matched using URL `.includes(...)`
- `RegExp`: matched using `.match(...)`

Ordering matters. Matching proceeds from the beginning of the instructions array. Put more specific matchers first.

### Response getter forms

Sync:

```typescript
(httpRequest, searchParams) => new HttpResponse({...})
```

Async:

```typescript
async (httpRequest, searchParams) => new HttpResponse({...})
```

The `searchParams` argument is already parsed from the request URL and is useful for filter/search tests.

## Prefer predefined instruction builders

Default to the helper factories before writing raw tuples.

Sync:

- `predefinedHttpCallInstructions.get.success(path, responseGetter?)`
- `predefinedHttpCallInstructions.get.error(path, responseGetter?)`
- `predefinedHttpCallInstructions.post.success(path, responseGetter?)`
- `predefinedHttpCallInstructions.post.error(path, responseGetter?)`
- `predefinedHttpCallInstructions.put.success(path, responseGetter?)`
- `predefinedHttpCallInstructions.put.error(path, responseGetter?)`
- `predefinedHttpCallInstructions.patch.success(path, responseGetter?)`
- `predefinedHttpCallInstructions.patch.error(path, responseGetter?)`
- `predefinedHttpCallInstructions.delete.success(path, responseGetter?)`
- `predefinedHttpCallInstructions.delete.error(path, responseGetter?)`

Async:

- same surface under `predefinedHttpCallInstructionsAsync`

Use raw tuples only when you need custom match logic, query-param-driven responses, timing controls, cancellation markers, or intermediate callbacks.

## Extra instruction parameters

The optional third tuple item supports:

- `delay`
- `timeline`
- `onCompleted`
- `willHaveBeenCancelled`
- `sustainable`

### `delay`

Relative delay before the response is flushed.

- Sync mode: implemented with `tick(delay)`.
- Async mode: implemented with real time or `advanceTimers(delay)`.

Use `delay` when a request should complete some time after it is registered, relative to the current stabilization flow.

### `timeline`

Absolute response time point within a single stabilization call.

Use `timeline` when response order matters across multiple requests and races.

Rules:

- Timeline counting resets for each call to `runTasksUntilStable` or `runTasksUntilStableAsync`.
- If the current stabilization time already passed the specified timeline, ngx-testbox throws `HttpInstructionTimelineExceededError`.
- `delay` and `timeline` are mutually exclusive. Using both throws `ConflictingHttpInstructionParamsError`.

Use timelines for race-condition tests, especially with request cancellation and stale responses.

### `onCompleted`

Callback that runs after an instruction is processed.

Use it for:

- intermediate assertions between request rounds
- simulating user actions immediately after a particular response lands
- verifying transient loading states

Important nuance:

- `onCompleted` runs after the request is processed, but not necessarily after the whole fixture is fully stabilized.
- It is intended for assertions about intermediate UI states during the stabilization sequence.

Pattern:

```typescript
[
  ['/api/first', 'GET'],
  () => new HttpResponse({body: {value: 'first'}, status: 200}),
  {
    onCompleted: () => {
      expect(harness.elements.status.getTextContent()).toContain('first');
    },
  },
]
```

### `willHaveBeenCancelled`

Use this when the test expects a request to be cancelled, for example by `switchMap` or manual unsubscription.

Why it matters:

- ngx-testbox otherwise expects declared instructions to be executed.
- for cancelled requests, this flag tells ngx-testbox that the instruction was expected to be consumed by a cancelled flow.

This is essential for race-condition tests.

### `sustainable`

By default, an instruction is consumed once.

Set `sustainable: true` when the same instruction should remain available across multiple matching requests during the same stabilization call.

Use it for polling-like or repeated equivalent requests only when that repeat behavior is intentional and test-relevant.

## Async mode with fake timers installed

If delayed instructions hang, pass `advanceTimers`.

Example:

```typescript
await runTasksUntilStableAsync(fixture, {
  httpCallInstructions,
  advanceTimers: (ms) => jasmine.clock().tick(ms),
});
```
