# Async Approach

## Use This Approach When

- writing a new test
- the app is zoneless or may become zoneless
- a response getter needs to return a `Promise`
- delayed instructions need real async completion instead of virtual Angular time

Use `runTasksUntilStableAsync` with `predefinedHttpCallInstructionsAsync` by default unless the surrounding suite is already built around `fakeAsync`.

## Core Shape

```typescript
await runTasksUntilStableAsync(fixture, {
  httpCallInstructions: [
    predefinedHttpCallInstructionsAsync.get.success('/api/items', () => items),
  ],
});
```

Parameters that matter most:

- `httpCallInstructions?: HttpCallInstructionAsync[]`
- `advanceTimers?: (delayMs: number) => void | Promise<void>`
- `componentLongRunTimeout?: number` default `10000`
- `debug?: boolean`

## Rules That Matter

- Async response getters may return plain values or `Promise` values.
- `runTasksUntilStableAsync` waits for `fixture.whenStable()` and throws `LongRunningComponentError` if the fixture never settles before the timeout.
- If delayed instructions are used under fake timers, pass `advanceTimers` or the test can hang.
- Matching proceeds from the beginning of `httpCallInstructions`, so put more specific matchers first.

## Minimal Setup Pattern

```typescript
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {DebugElementHarness, predefinedHttpCallInstructionsAsync, runTasksUntilStableAsync} from 'ngx-testbox/testing';

const fixture: ComponentFixture<MyComponent> = TestBed.createComponent(MyComponent);
const harness = new DebugElementHarness(fixture.debugElement, testIds);

await runTasksUntilStableAsync(fixture, {
  httpCallInstructions: [
    predefinedHttpCallInstructionsAsync.get.success('/api/items', () => mockItems),
  ],
});
```

Finish stubbing, input setup, and harness creation before the first stabilization call because `runTasksUntilStableAsync` triggers `fixture.detectChanges()` internally.

## Examples

### Initial load

```typescript
await runTasksUntilStableAsync(fixture, {
  httpCallInstructions: [
    predefinedHttpCallInstructionsAsync.get.success('/api/items', () => items),
  ],
});

expect(harness.elements.item.queryAll().length).toBe(items.length);
```

### User action followed by POST

```typescript
harness.elements.nameInput.inputValue('New hero');
harness.elements.addButton.click();

await runTasksUntilStableAsync(fixture, {
  httpCallInstructions: [
    predefinedHttpCallInstructionsAsync.post.success('/api/heroes', async (req) => ({
      id: 1,
      name: (req.body as {name: string}).name,
    })),
  ],
});

expect(harness.elements.heroName.getTextContent()).toContain('New hero');
```

### Query-param filtering

Use a raw tuple when the response depends on `searchParams`.

```typescript
await runTasksUntilStableAsync(fixture, {
  httpCallInstructions: [
    [
      ['/api/todos', 'GET'],
      async (_req, searchParams) => {
        const title = searchParams.get('title') ?? '';

        return new HttpResponse({
          body: allTodos.filter((todo) => todo.title.includes(title)),
          status: 200,
        });
      },
    ],
  ],
});
```

### Race and cancellation flow

Use `timeline` to force response order and `willHaveBeenCancelled: true` for requests expected to be dropped.

```typescript
harness.elements.countryInput.inputValue('g');
harness.elements.countryInput.inputValue('ge');

await runTasksUntilStableAsync(fixture, {
  httpCallInstructions: [
    [
      ['/api/countries', 'GET'],
      async () => new HttpResponse({body: ['Germany'], status: 200}),
      {
        willHaveBeenCancelled: true,
        timeline: 50,
      },
    ],
    [
      ['/api/countries', 'GET'],
      async () => new HttpResponse({body: ['Georgia'], status: 200}),
      {
        timeline: 80,
      },
    ],
  ],
});
```

### Intermediate assertion with `onCompleted`

```typescript
await runTasksUntilStableAsync(fixture, {
  httpCallInstructions: [
    [
      ['/api/first', 'GET'],
      async () => new HttpResponse({body: {step: 'first'}, status: 200}),
      {
        onCompleted: () => {
          expect(harness.elements.status.getTextContent()).toContain('first');
        },
      },
    ],
    predefinedHttpCallInstructionsAsync.get.success('/api/second', () => ({step: 'second'})),
  ],
});
```

### Delays with fake timers installed

If the runner uses fake timers, advance them explicitly.

```typescript
await runTasksUntilStableAsync(fixture, {
  httpCallInstructions: [
    [
      ['/api/items', 'GET'],
      async () => new HttpResponse({body: items, status: 200}),
      {delay: 200},
    ],
  ],
  advanceTimers: (ms) => jasmine.clock().tick(ms),
});
```

## Common Failure Patterns

- `LongRunningComponentError`: unresolved async work, leaked timers, or fake timers not advanced.
- `NoMatchingHttpInstructionForRequestFoundError`: missing matcher, wrong method, or the string path matched differently than expected.
- `HttpInstructionWasNotExecutedDuringFixtureStabilizationError`: an instruction was declared but the component never reached that request path.
- `HttpInstructionTimelineExceededError`: an absolute timeline is now impossible because earlier work already consumed too much time.
