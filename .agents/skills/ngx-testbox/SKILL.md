---
name: ngx-testbox
description: Angular integration tests, ngx-testbox, runTasksUntilStable, runTasksUntilStableAsync, DebugElementHarness, testboxTestId. Use when creating, fixing, or reviewing Angular tests that use ngx-testbox or should use its black-box testing patterns.
license: MIT
compatibility: "ngx-testbox: 2.0.0"
---

# ngx-testbox

Use this skill whenever you create, review, debug, or refactor Angular integration tests that use `ngx-testbox`.

This skill is part of the `ngx-testbox` library itself and is intended to ship with the library source.

Before working, load the focused companion docs that match the task:

- Creating, editing, or reviewing a test: read `quick-reference.md` and `testing.md` first.
- Using `async`/`await`, zoneless testing, Promise response getters, or fake timers in async mode: read `async-approach.md`.
- Using `fakeAsync`, `tick()`, or sync stabilization in an existing zone-based suite: read `sync-fakeasync-approach.md`.
- Choosing between modes, or debugging timeout/cancellation/timing behavior that applies to both: read `concepts.md`.
- Looking for a proven implementation pattern or starter skeleton: read `examples.md`.

Common gotchas to keep in mind before editing tests:

- `runTasksUntilStable` and `runTasksUntilStableAsync` call `fixture.detectChanges()` internally, so finish stubbing, inputs, and harness setup before the first stabilization call.
- Do not mix `ngx-testbox` stabilization with direct `HttpTestingController.expectOne(...)` flows in the same test unless you are deliberately doing low-level debugging.
- String URL matchers use `.includes(...)`, so broad paths can match more than intended.
- `delay` and `timeline` cannot be used together on the same instruction.

Companion docs:

- `quick-reference.md`: condensed rules for fast implementation
- `concepts.md`: purpose, decision rules, supported APIs, strictness, and errors
- `testing.md`: setup patterns, harness usage, workflow, assertions, and troubleshooting
- `async-approach.md`: async stabilization workflow, timing, and examples
- `sync-fakeasync-approach.md`: `fakeAsync` stabilization workflow, timing, and examples
- `examples.md`: cross-cutting patterns and starter snippets

Recommended reading order when you need broad context:

1. `quick-reference.md`
2. `testing.md`
3. `concepts.md`
4. `examples.md`

Important: both stabilization APIs are supported parts of the library.

- `runTasksUntilStableAsync` is the preferred default for new tests.
- `runTasksUntilStable` remains an eligible, supported API for `fakeAsync` and existing zone-based suites.

Choose based on the test environment and current suite patterns, not on the assumption that sync support is obsolete.
