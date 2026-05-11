# Plan: Documentation Changes for Zoneless Support

## 1. Current documentation state

The docs describe a **Zone.js-first** world:

- `intro.md` presents the very first test example wrapped in `fakeAsync` and calls `runTasksUntilStable` synchronously.
- `core-concepts.md` explicitly states: *"Angular provides a unique advantage: it tracks all asynchronous operations within the Angular Zone."* and describes stability in terms of Zone behavior.
- `tutorial-basics/API definition.md` documents `runTasksUntilStable` with a note: *"This function is designed to work only within fakeAsync zone."* It documents `passTime` as a core utility.
- `tutorial-basics/Test components.md` provides extensive cookbook examples, all using `fakeAsync` and `passTime`.
- `troubleshooting.md` discusses `setInterval` in the context of Zone.js periodic timers and `discardPeriodicTasks`.
- There is no guidance for:
  - Zoneless applications
  - `async/await` testing patterns
  - Fake timers from test runners (Jasmine / Vitest)
  - When to choose sync vs async APIs

## 2. Desired documentation state

After the change, the documentation must serve **two audiences**:

1. **Existing users** on Angular <= v19 or legacy zone-based apps — they keep using the current APIs. Their docs must remain findable.
2. **New / migrating users** on Angular v20+ zoneless apps — they need clear async patterns.

Specific outcomes:

- A dedicated **Zoneless Testing** guide that explains the async model and fake timers.
- `intro.md` updated to show the async pattern as the primary example, with a link to legacy zone-based examples.
- `core-concepts.md` updated to acknowledge zoneless change detection and PendingTasks.
- `API definition.md` updated with `runTasksUntilStableAsync`, `advanceTimersBy`, and deprecation notices on `passTime`.
- `Test components.md` updated with zoneless cookbook examples.
- `troubleshooting.md` updated with zoneless-specific issues (e.g., reactive forms not triggering CD, when to use fake timers).

## 3. Gap analysis

| Document | Zoneless content | Fake timers content | Legacy sync content | Action needed |
|----------|-----------------|---------------------|---------------------|---------------|
| `intro.md` | Missing | Missing | Present | Rewrite primary example to async; move fakeAsync to legacy section |
| `core-concepts.md` | Missing | Missing | Present | Add zoneless concept section; keep Zone section as "legacy context" |
| `tutorial-basics/API definition.md` | Missing | Missing | Present | Add `runTasksUntilStableAsync`, `advanceTimersBy`, deprecate `passTime` |
| `tutorial-basics/Test components.md` | Missing | Missing | Present | Add zoneless cookbook examples; keep existing ones labeled "legacy" |
| `troubleshooting.md` | Missing | Missing | Present | Add zoneless FAQ; keep existing entries |
| New zoneless guide | Missing | Missing | N/A | **Create new** |

## 4. Detailed implementation steps

### Step 4.1: Create new guide — `zoneless-testing.md`

**File:** `ngx-testbox-docs/docs/zoneless-testing.md`

**Content outline:**
- Introduction: why zoneless matters, Angular v20+ default.
- Conceptual shift: from `fakeAsync` to `async/await` + `fixture.whenStable()`.
- The `runTasksUntilStableAsync` API:
  - Signature and parameters.
  - How the async loop works.
  - Why `advanceTimersBy` is needed and how to wire it (Jasmine example, Vitest example).
- Step-by-step example: converting a `fakeAsync` test to zoneless.
- FAQ:
  - "My debounced input doesn't queue HTTP until I advance timers."
  - "Reactive form changes don't update the UI."
  - "Can I mix zoneless and zone-based tests in the same project?"

### Step 4.2: Update `intro.md`

**File:** `ngx-testbox-docs/docs/intro.md`

- Replace the primary code example (lines 71-83) with an `async` version using `runTasksUntilStableAsync`.
- Add a callout box: **"Using Angular with Zone.js?"** linking to a preserved legacy example lower in the page or to `API definition.md`.
- Keep the installation and TestId setup unchanged.
- Ensure the very first example a new user sees is zoneless-compatible.

### Step 4.3: Update `core-concepts.md`

**File:** `ngx-testbox-docs/docs/core-concepts.md`

- In the **"What makes it work"** section, add a parallel paragraph:
  - For zoneless apps, Angular uses `PendingTasks` and explicit notifications (`markForCheck`, signals, `setInput`) to know when to synchronize. `runTasksUntilStableAsync` waits via `fixture.whenStable()`, which is backed by `PendingTasks`.
- Keep the existing Zone paragraph, but label it as the mechanism for legacy Zone.js applications.
- Mention that both paths lead to the same outcome: deterministic, stable test runs.

### Step 4.4: Update `tutorial-basics/API definition.md`

**File:** `ngx-testbox-docs/docs/tutorial-basics/API definition.md`

- Add a new section for **`runTasksUntilStableAsync`** right after `runTasksUntilStable`.
  - Full signature with `advanceTimersBy`.
  - Example using Jasmine fake timers.
  - Example using Vitest fake timers.
  - Explicit note: *"Use this in zoneless applications or when Zone.js is not loaded."*
- Update **`runTasksUntilStable`** docs:
  - Add a note: *"Legacy API for Zone.js environments. In zoneless apps, use `runTasksUntilStableAsync`."*
- Update **`passTime`** docs:
  - Add `@deprecated` styling or a warning callout.
  - Explain it only works inside `fakeAsync` and recommend test-runner fake timers instead.
- Ensure all other APIs (`completeHttpCalls`, `DebugElementHarness`, `predefinedHttpCallInstructions`) are marked as zone-agnostic (no changes needed beyond reassurance).

### Step 4.5: Update `tutorial-basics/Test components.md`

**File:** `ngx-testbox-docs/docs/tutorial-basics/Test components.md`

- Add a new top-level section: **"Zoneless Cookbook"**.
  - Example: Component initialization with `runTasksUntilStableAsync`.
  - Example: Filtering with debounce + `advanceTimersBy`.
  - Example: Adding a todo (form input dispatchEvent emphasized).
- Keep all existing `fakeAsync` examples, but add a heading: **"Legacy Zone.js Examples"**.
- Add a short migration snippet showing side-by-side `fakeAsync` vs `async` for the same test.

### Step 4.6: Update `troubleshooting.md`

**File:** `ngx-testbox-docs/docs/troubleshooting.md`

- Add new entries:
  - **"Input changes are not reflected in the DOM in zoneless tests"**
    - Cause: reactive forms / direct property assignment without event dispatch or change notification.
    - Fix: dispatch `input` event; use signals or call `markForCheck()`.
  - **"HTTP request is not queued immediately after user action"**
    - Cause: debounce / `setTimeout` delays the request.
    - Fix: use `advanceTimersBy` with your test runner's fake timers.
  - **"`fakeAsync` throws or is not available"**
    - Cause: Zone.js is removed.
    - Fix: switch to `runTasksUntilStableAsync` and remove `fakeAsync` wrapper.
- Keep existing entries (periodic timers, HTTP stability) but relabel the page as covering both zone and zoneless issues.

### Step 4.7: Cross-link the zoneless migration investigation

**File:** `ngx-testbox-docs/docs/zoneless-migration-investigation.md` (already exists)

- Add a link to the new `zoneless-testing.md` guide at the top: *"For a hands-on guide, see Zoneless Testing."*
- Ensure the investigation doc is linked from `intro.md` or `core-concepts.md` for users who want the deep-dive rationale.

## 5. Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Users on older Angular versions feel abandoned if `fakeAsync` examples are hidden | Medium | Keep legacy examples in the same docs, clearly labeled but not removed. |
| Documentation becomes bloated with dual examples | Medium | Use tabs (if the doc framework supports them) or clearly separated sections. Avoid interleaving. |
| Inaccurate zoneless guidance due to edge cases not yet discovered in implementation | High | Write docs *after* the code is implemented and tested. This plan is sequential: code first, docs second. |
| `advanceTimersBy` examples confuse users who don't need timers | Low | Show the simplest `runTasksUntilStableAsync` example first *without* `advanceTimersBy`, then add the timer example as an "advanced" callout. |

## 6. Success criteria

- [ ] A new `zoneless-testing.md` guide is published and readable.
- [ ] `intro.md` primary example uses `runTasksUntilStableAsync` and `async`.
- [ ] `API definition.md` contains complete `runTasksUntilStableAsync` and `advanceTimersBy` definitions.
- [ ] `passTime` documentation carries a visible deprecation warning.
- [ ] At least one side-by-side migration snippet exists (fakeAsync vs async).
- [ ] All existing documentation links remain valid (no broken internal anchors).
- [ ] `troubleshooting.md` contains zoneless-specific entries.

## 7. Testing strategy (for docs)

- **Code-sample validation:** Every TypeScript snippet in the docs must be copy-pasteable into the actual `tour-of-heroes` test suite and pass. Create a CI step (if not already present) that compiles doc examples as part of the build.
- **Peer review:** Have a zoneless Angular user review `zoneless-testing.md` for clarity before publishing.
- **Link check:** Run a markdown link checker to ensure internal cross-references (`[Zoneless Testing](zoneless-testing.md)`) resolve correctly.
- **Version clarity:** Add a note at the top of `zoneless-testing.md` stating: *"This guide applies to Angular v20+ and ngx-testbox vX.Y+. For Zone.js based testing, see the legacy examples in Test Components."*
