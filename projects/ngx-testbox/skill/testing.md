# ngx-testbox Testing Workflow

## Non-negotiable workflow

Follow this sequence unless the codebase already has a stronger established wrapper around `ngx-testbox`.

1. Define stable test IDs as a readonly array.
2. Build a typed map with `TestIdDirective.idsToMap(testIds)`.
3. Apply `[testboxTestId]` in component templates, or keep an existing custom test attribute if the project already has one.
4. Configure TestBed with the component and HTTP testing providers.
5. Create the fixture.
6. Create `DebugElementHarness` with the same `testIds` array.
7. Trigger user actions through the harness.
8. Stabilize the fixture with the correct function and the exact HTTP instructions needed for that phase.
9. Assert on DOM state, rendered text, enabled/disabled state, visible errors, navigation outcomes, and other user-observable results.
10. Verify tests with the repo's expected test command.

Important: `runTasksUntilStable` and `runTasksUntilStableAsync` both call `fixture.detectChanges()` internally and are intended to trigger the initial lifecycle, including `ngOnInit`, after your setup is complete. That means you should usually finish stubbing, input setup, and harness creation before the first stabilization call.

## Setup patterns

### Test IDs

Preferred pattern:

```typescript
import {TestIdDirective} from 'ngx-testbox';

export const testIds = [
  'title',
  'submitButton',
  'errorMessage',
] as const;

export const testIdMap = TestIdDirective.idsToMap(testIds);
```

Template pattern:

```html
<h1 [testboxTestId]="testIdMap.title">Title</h1>
<button [testboxTestId]="testIdMap.submitButton">Submit</button>
@if (error) {
  <p [testboxTestId]="testIdMap.errorMessage">{{ error }}</p>
}
```

Notes:

- `TestIdDirective` writes the `data-test-id` attribute.
- The directive is standalone and imported directly into standalone components.
- `DebugElementHarness` can also work with an existing attribute name by passing a third constructor argument.
- The directive and harness are optional utilities, but they are the preferred pattern in this repo.

### TestBed setup

Use Angular HTTP testing providers:

```typescript
providers: [provideHttpClient(), provideHttpClientTesting()]
```

Do not mix `ngx-testbox` stabilization with manual `HttpTestingController.expectOne(...)` flows in the same test unless you are doing deliberate low-level debugging. The intended pattern is to let `ngx-testbox` own HTTP queue processing during stabilization.

## DebugElementHarness usage

Create it like this:

```typescript
const harness = new DebugElementHarness(fixture.debugElement, testIds);
```

Available element APIs per test ID:

- `query(parentDebugElement?)`
- `queryAll(parentDebugElement?)`
- `click(parentDebugElement?)`
- `focus(parentDebugElement?)`
- `getTextContent(parentDebugElement?)`
- `changeValue(value, parentDebugElement?)`
- `inputValue(value, parentDebugElement?)`

Behavior details that matter:

- `query()` returns the matching `DebugElement`. If nothing matches, Angular returns `null`, but that's fine. That's better to fall fast, don't try to adapt tests to null value.
- `queryAll()` returns an array and is safe for zero matches.
- Action helpers like `click`, `focus`, `getTextContent`, `changeValue`, and `inputValue` throw `NoElementByTestIdFoundError` if the target element is missing.
- `changeValue()` dispatches a `'change'` event.
- `inputValue()` dispatches an `'input'` event.
- All APIs accept an optional parent `DebugElement` for scoped queries inside repeated rows or nested containers.

Use harness queries for DOM interaction whenever possible. This keeps tests consistent and readable.

Example:

```typescript
const rows = harness.elements.item.queryAll();
expect(rows.length).toBe(2);
expect(harness.elements.itemTitle.getTextContent(rows[0])).toContain('First');

harness.elements.nameInput.inputValue('Alice');
harness.elements.submitButton.click();
```

## What to assert

Prefer assertions on:

- rendered text
- presence or absence of elements
- counts of repeated items
- loading states
- enabled/disabled controls
- error messages
- route/navigation side effects visible through stable public collaborators
- request payload shape inside response getter logic when that payload is a user-visible effect of form editing

Avoid relying on:

- private members
- implementation-only observables/signals unless the test explicitly targets them
- brittle CSS selectors when test IDs exist
- assertion style that checks a method was called instead of checking the result of that call

## Troubleshooting rules

### setInterval or never-ending timers

Symptoms:

- async mode: `LongRunningComponentError`
- sync mode: `MaximumAttemptsToStabilizeFixtureReachedError`
- fakeAsync periodic timer complaints

Response:

- rerun with `debug: true`
- inspect the console warning stack trace from the internal `setInterval` patching
- mock the interval source, or run it outside Angular via `NgZone.runOutsideAngular(...)`

Note from repo docs:

- in Angular 17 and earlier, `runOutsideAngular` plus `fakeAsync` may still require `discardPeriodicTasks()` at the end of the test
- docs note that Angular 18+ improves this

### Unused instruction

Do not add broad placeholder instructions. Instead:

- remove the unused instruction
- verify the user action actually happened
- verify `ngOnInit` or the relevant callback was triggered
- ensure more specific instructions come before broader ones

### Unhandled request

Do not fall back to manual `expectOne` by default. Instead:

- add the missing instruction
- check URL matching semantics: string match uses `.includes()`
- verify the HTTP method
- use a functional matcher for complex cases

## Agent checklist before finishing a task

1. Did you choose async mode by default unless fakeAsync was already the right fit?
2. Did you use test IDs and the harness instead of brittle selectors?
3. Did you provide exactly the HTTP instructions the flow needs?
4. Did you avoid mixing manual `HttpTestingController.expectOne` with ngx-testbox stabilization?
5. Did you account for cancellation, delay, timeline, or repeated requests when relevant?
6. Did you preserve or extend sync `runTasksUntilStable` patterns when the suite is already built around `fakeAsync`?
7. Did you assert on user-visible outcomes rather than internals where possible?
8. Did you verify the relevant tests, ideally with `npm run test:coverage` from the repo root for library work?
