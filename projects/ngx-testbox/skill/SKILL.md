---
name: ngx-testbox
description: Angular integration tests, ngx-testbox, runTasksUntilStable, runTasksUntilStableAsync, DebugElementHarness, testboxTestId. Use when creating, fixing, or reviewing Angular tests that use ngx-testbox or should use its black-box testing patterns.
---

# ngx-testbox

Use this skill whenever you create, review, debug, or refactor Angular integration tests that use `ngx-testbox`.

This skill is part of the `ngx-testbox` library itself and is intended to ship with the library source.

Read the focused companion docs as needed:

- `quick-reference.md`: condensed rules for fast implementation
- `concepts.md`: purpose, decision rules, supported APIs, strictness, and errors
- `testing.md`: setup patterns, harness usage, workflow, assertions, and troubleshooting
- `api-modes.md`: async and sync stabilization APIs, HTTP instruction semantics, timing, and cancellation
- `examples.md`: canonical repo examples and starter snippets

Recommended reading order for most tasks:

1. `quick-reference.md`
2. `testing.md`
3. `api-modes.md`
4. `examples.md`

Important: both stabilization APIs are supported parts of the library.

- `runTasksUntilStableAsync` is the preferred default for new tests.
- `runTasksUntilStable` remains an eligible, supported API for `fakeAsync` and existing zone-based suites.

Choose based on the test environment and current suite patterns, not on the assumption that sync support is obsolete.
