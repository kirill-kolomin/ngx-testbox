# ngx-testbox Examples

Use this file as a pattern index. For full mode-specific examples, load `async-approach.md` or `sync-fakeasync-approach.md`.

## Common patterns

### Initial load

Create fixture and harness, then stabilize once with the initial GET instructions.

Async:

```typescript
await runTasksUntilStableAsync(fixture, {
  httpCallInstructions: [
    predefinedHttpCallInstructionsAsync.get.success('/api/items', () => items),
  ],
});
```

Sync:

```typescript
runTasksUntilStable(fixture, {
  httpCallInstructions: [
    predefinedHttpCallInstructions.get.success('/api/items', () => items),
  ],
});
```

### User action followed by HTTP

Trigger the interaction first, then stabilize with only the instructions needed for that action.

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

### Search/filter driven by query params

Use raw instructions so you can inspect `searchParams`.

```typescript
[
  ['/api/todos', 'GET'],
  (req, searchParams) => {
    const title = searchParams.get('title') ?? '';
    return new HttpResponse({
      body: allTodos.filter((todo) => todo.title.includes(title)),
      status: 200,
    });
  },
]
```

### Race conditions and cancellation

Use:

- `timeline` to control absolute ordering
- `willHaveBeenCancelled: true` for requests expected to be dropped
- `onCompleted` for intermediate loading-state assertions
- `advanceTimers` in async mode if fake timers are installed

Load `async-approach.md` or `sync-fakeasync-approach.md` for full race and cancellation examples.

### Intermediate assertions during multi-step flows

Use `onCompleted` callbacks instead of manually splitting the request flow if the test is really about transient states.

Load `async-approach.md` or `sync-fakeasync-approach.md` for full `onCompleted` examples.

### Reusable component-specific harness

For larger specs, define a component harness class that extends `DebugElementHarness<typeof testIds>` and adds semantic helper methods like `setHeroName`, `clickSaveButton`, or `getHeroTitle`.

This is preferred when raw `harness.elements.*` usage starts to make tests repetitive.

## Source Material Note

These examples were distilled from the library docs, the public API surface, and the development repository's own tests. Keep this shipped file self-contained; do not rely on non-shipping `.spec.ts` paths when teaching a consumer-facing pattern.

## Recommended default skeletons

### Async skeleton

```typescript
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {
  DebugElementHarness,
  predefinedHttpCallInstructionsAsync,
  runTasksUntilStableAsync,
} from 'ngx-testbox/testing';

it('shows the loaded data', async () => {
  const fixture: ComponentFixture<MyComponent> = TestBed.createComponent(MyComponent);
  const harness = new DebugElementHarness(fixture.debugElement, testIds);

  await runTasksUntilStableAsync(fixture, {
    httpCallInstructions: [
      predefinedHttpCallInstructionsAsync.get.success('/api/items', () => mockItems),
    ],
  });

  expect(harness.elements.item.queryAll().length).toBe(mockItems.length);
});
```

### Sync skeleton

```typescript
import {fakeAsync, TestBed} from '@angular/core/testing';
import {
  DebugElementHarness,
  predefinedHttpCallInstructions,
  runTasksUntilStable,
} from 'ngx-testbox/testing';

it('shows the loaded data', fakeAsync(() => {
  const fixture = TestBed.createComponent(MyComponent);
  const harness = new DebugElementHarness(fixture.debugElement, testIds);

  runTasksUntilStable(fixture, {
    httpCallInstructions: [
      predefinedHttpCallInstructions.get.success('/api/items', () => mockItems),
    ],
  });

  expect(harness.elements.item.queryAll().length).toBe(mockItems.length);
}));
```
