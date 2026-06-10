# ngx-testbox Examples

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

Canonical repo examples:

- `projects/ngx-testbox/src/__tests__/async/run-tasks-until-stable-async-country-race-and-cancellation.spec.ts`
- `projects/ngx-testbox/src/__tests__/sync/run-tasks-until-stable-country-race-and-cancellation.spec.ts`

### Intermediate assertions during multi-step flows

Use `onCompleted` callbacks instead of manually splitting the request flow if the test is really about transient states.

Canonical repo examples:

- `projects/ngx-testbox/src/__tests__/async/run-tasks-until-stable-async-intermediate-asserts.spec.ts`
- `projects/ngx-testbox/src/__tests__/sync/run-tasks-until-stable-intermediate-asserts.spec.ts`

### Reusable component-specific harness

For larger specs, define a component harness class that extends `DebugElementHarness<typeof testIds>` and adds semantic helper methods like `setHeroName`, `clickSaveButton`, or `getHeroTitle`.

Canonical repo examples:

- `projects/tour-of-heroes/src/app/heroes/heroes.harness.ts`
- `projects/tour-of-heroes/src/app/hero-detail/hero-detail.harness.ts`

This is preferred when raw `harness.elements.*` usage starts to make tests repetitive.

## Canonical examples in this repository

Use these files as source-of-truth examples before inventing a pattern:

### Public docs

- `ngx-testbox-docs/docs/core-concepts.md`
- `ngx-testbox-docs/docs/Guides/test-components.md`
- `ngx-testbox-docs/docs/Approaches/async-approach.md`
- `ngx-testbox-docs/docs/Approaches/sync-approach.md`
- `ngx-testbox-docs/docs/Api/http-call-instruction.md`
- `ngx-testbox-docs/docs/troubleshooting.md`

### Public API implementation

- `projects/ngx-testbox/testing/src/public_api.ts`
- `projects/ngx-testbox/testing/src/run-tasks-until-stable.ts`
- `projects/ngx-testbox/testing/src/run-tasks-until-stable-async.ts`
- `projects/ngx-testbox/testing/src/debug-element-harness.ts`
- `projects/ngx-testbox/testing/src/interfaces/http-call.ts`
- `projects/ngx-testbox/src/lib/directives/test-id.directive.ts`

### Library specs

- `projects/ngx-testbox/src/__tests__/async/run-tasks-until-stable-async.spec.ts`
- `projects/ngx-testbox/src/__tests__/async/run-tasks-until-stable-async-intermediate-asserts.spec.ts`
- `projects/ngx-testbox/src/__tests__/async/run-tasks-until-stable-async-country-race-and-cancellation.spec.ts`
- `projects/ngx-testbox/src/__tests__/sync/run-tasks-until-stable.spec.ts`
- `projects/ngx-testbox/src/__tests__/sync/run-tasks-until-stable-intermediate-asserts.spec.ts`
- `projects/ngx-testbox/src/__tests__/sync/run-tasks-until-stable-country-race-and-cancellation.spec.ts`
- `projects/ngx-testbox/src/__tests__/debug-element-harness.spec.ts`

### Example app specs

- `projects/tour-of-heroes/src/app/heroes/heroes.component.spec.ts`
- `projects/tour-of-heroes/src/app/hero-detail/hero-detail.component.spec.ts`
- `projects/tour-of-heroes/src/app/dashboard/dashboard.component.spec.ts`
- `projects/tour-of-heroes/src/app/hero-search/hero-search.component.spec.ts`

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
