# ngx-testbox Quick Reference

## Use This Skill When

- Angular tests use `ngx-testbox`
- you need `runTasksUntilStable` or `runTasksUntilStableAsync`
- you see `DebugElementHarness`, `testboxTestId`, or `TestIdDirective`
- you are converting brittle Angular tests to black-box integration tests

## Default Decisions

- New test: prefer `runTasksUntilStableAsync`
- Existing `fakeAsync` suite: use `runTasksUntilStable`
- Need async response getter: async mode only
- Need zoneless support: async mode
- Need virtual Angular time with `tick()`: sync mode

## Standard Recipe

1. Define `testIds` with `as const`
2. Create `testIdMap = TestIdDirective.idsToMap(testIds)`
3. Use `[testboxTestId]="testIdMap.foo"` in template
4. Create `const harness = new DebugElementHarness(fixture.debugElement, testIds)`
5. Trigger interactions through `harness.elements.*`
6. Stabilize with exact `httpCallInstructions`
7. Assert on DOM output

## Supported Modes

- Async: `runTasksUntilStableAsync` plus `predefinedHttpCallInstructionsAsync`; see `async-approach.md`
- Sync: `runTasksUntilStable` plus `predefinedHttpCallInstructions`; see `sync-fakeasync-approach.md`

Both are supported parts of the library.

## Async Skeleton

```typescript
await runTasksUntilStableAsync(fixture, {
  httpCallInstructions: [
    predefinedHttpCallInstructionsAsync.get.success('/api/items', () => items),
  ],
});
```

## Sync Skeleton

```typescript
runTasksUntilStable(fixture, {
  httpCallInstructions: [
    predefinedHttpCallInstructions.get.success('/api/items', () => items),
  ],
});
```

## Harness Rules

- `query()` may return `null`, but that's fine. That's better to fall fast, don't try to adapt tests to null value.
- `queryAll()` is safe for zero matches
- `click`, `focus`, `getTextContent`, `changeValue`, `inputValue` throw if missing
- `changeValue()` dispatches `change`
- `inputValue()` dispatches `input`

## HTTP Instruction Rules

- prefer predefined helpers first
- string URL matcher uses `.includes()`
- order matters: more specific instructions first
- raw tuple form is for custom logic

```typescript
[
  ['/api/search', 'GET'],
  (req, searchParams) => new HttpResponse({body: [], status: 200}),
  {delay: 200},
]
```

## Extra Params

- `delay`: relative delay
- `timeline`: absolute time point within one stabilization call
- `onCompleted`: intermediate assertion or mid-flow action
- `willHaveBeenCancelled`: expected cancellation
- `sustainable`: reusable instruction within same stabilization call

## Never Do This

- do not mix ngx-testbox stabilization with direct `expectOne(...)`
- do not add unused instructions
- do not ignore unhandled requests
- do not return a Promise in sync fakeAsync mode

## Error Meanings

- `NoMatchingHttpInstructionForRequestFoundError`: missing or wrong instruction
- `HttpInstructionWasNotExecutedDuringFixtureStabilizationError`: unused instruction
- `LongRunningComponentError`: async stabilization timed out
- `MaximumAttemptsToStabilizeFixtureReachedError`: sync stabilization never converged
- `CannotUsePromiseResponseWithinFakeAsync`: wrong mode
- `ConflictingHttpInstructionParamsError`: both `delay` and `timeline`
- `HttpInstructionTimelineExceededError`: impossible ordering
- `NoElementByTestIdFoundError`: harness target missing

## More Examples

- `examples.md`: cross-cutting patterns and reusable harness guidance
- `async-approach.md`: async loading, POST, filtering, race/cancellation, and delayed-response examples
- `sync-fakeasync-approach.md`: sync `fakeAsync` loading, POST, filtering, race/cancellation, and stabilization examples
