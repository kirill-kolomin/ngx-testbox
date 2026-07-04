# Sync fakeAsync Approach

## Use This Approach When

- the surrounding test suite already uses Angular `fakeAsync`
- you need deterministic virtual Angular time with `tick()`
- the project is still built around zone-based test patterns

Use `runTasksUntilStable` with `predefinedHttpCallInstructions` when the suite is already committed to `fakeAsync`. Do not switch a stable sync suite to async mode unless there is a concrete need.

## Core Shape

```typescript
runTasksUntilStable(fixture, {
  httpCallInstructions: [
    predefinedHttpCallInstructions.get.success('/api/items', () => items),
  ],
});
```

Parameters that matter most:

- `httpCallInstructions?: HttpCallInstruction[]`
- `stabilizationTimeAdvance?: number` default `0`
- `maxAttempts?: number` default `30`
- `debug?: boolean`

## Rules That Matter

- Only use this API inside `fakeAsync` tests.
- Response getters must be synchronous. Returning a `Promise` throws `CannotUsePromiseResponseWithinFakeAsync`.
- `runTasksUntilStable` drives stabilization with Angular fakeAsync time and repeated stabilization rounds.
- `stabilizationTimeAdvance` advances virtual time on every stabilization attempt.

## Minimal Setup Pattern

```typescript
import {fakeAsync, TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {DebugElementHarness, predefinedHttpCallInstructions, runTasksUntilStable} from 'ngx-testbox/testing';

it('shows loaded data', fakeAsync(() => {
  const fixture = TestBed.createComponent(MyComponent);
  const harness = new DebugElementHarness(fixture.debugElement, testIds);

  runTasksUntilStable(fixture, {
    httpCallInstructions: [
      predefinedHttpCallInstructions.get.success('/api/items', () => mockItems),
    ],
  });
}));
```

Finish stubbing, input setup, and harness creation before the first stabilization call because `runTasksUntilStable` triggers `fixture.detectChanges()` internally.

## Examples

### Initial load

```typescript
runTasksUntilStable(fixture, {
  httpCallInstructions: [
    predefinedHttpCallInstructions.get.success('/api/items', () => items),
  ],
});

expect(harness.elements.item.queryAll().length).toBe(items.length);
```

### User action followed by POST

```typescript
harness.elements.nameInput.inputValue('New hero');
harness.elements.addButton.click();

runTasksUntilStable(fixture, {
  httpCallInstructions: [
    predefinedHttpCallInstructions.post.success('/api/heroes', (req) => ({
      id: 1,
      name: (req.body as {name: string}).name,
    })),
  ],
});
```

### Query-param filtering

```typescript
runTasksUntilStable(fixture, {
  httpCallInstructions: [
    [
      ['/api/todos', 'GET'],
      (_req, searchParams) =>
        new HttpResponse({
          body: allTodos.filter((todo) => todo.title.includes(searchParams.get('title') ?? '')),
          status: 200,
        }),
    ],
  ],
});
```

### Race and cancellation flow

```typescript
harness.elements.countryInput.inputValue('g');
harness.elements.countryInput.inputValue('ge');

runTasksUntilStable(fixture, {
  httpCallInstructions: [
    [
      ['/api/countries', 'GET'],
      () => new HttpResponse({body: ['Germany'], status: 200}),
      {
        willHaveBeenCancelled: true,
        timeline: 50,
      },
    ],
    [
      ['/api/countries', 'GET'],
      () => new HttpResponse({body: ['Georgia'], status: 200}),
      {
        timeline: 80,
      },
    ],
  ],
});
```

### Intermediate assertion with `onCompleted`

```typescript
runTasksUntilStable(fixture, {
  httpCallInstructions: [
    [
      ['/api/first', 'GET'],
      () => new HttpResponse({body: {step: 'first'}, status: 200}),
      {
        onCompleted: () => {
          expect(harness.elements.status.getTextContent()).toContain('first');
        },
      },
    ],
    predefinedHttpCallInstructions.get.success('/api/second', () => ({step: 'second'})),
  ],
});
```

### Stabilization that needs a small time nudge

When the flow only needs Angular time to move slightly on each stabilization attempt (debounce or throttle), use a `stabilizationTimeAdvance` and tune `maxAttempts` to cover the total timer delay.

```typescript
runTasksUntilStable(fixture, {
  stabilizationTimeAdvance: 300,
  maxAttempts: 30,
  httpCallInstructions: [
    predefinedHttpCallInstructions.get.success('/api/items', () => items),
  ],
});
```

Rule of thumb: `stabilizationTimeAdvance * maxAttempts` should cover the timer delay you need to flush.

## Common Failure Patterns

- `CannotUsePromiseResponseWithinFakeAsync`: a response getter returned a `Promise`; switch to async mode or make the getter synchronous.
- `MaximumAttemptsToStabilizeFixtureReachedError`: the fixture never converged, commonly because of periodic timers or recurring work.
- fakeAsync periodic timer failures: mock the interval source, run it outside Angular, or discard periodic tasks when that is still required by the Angular version under test.
- `NoMatchingHttpInstructionForRequestFoundError`: wrong matcher, wrong method, or unexpected extra request.
