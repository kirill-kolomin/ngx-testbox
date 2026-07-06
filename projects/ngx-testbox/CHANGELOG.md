# Change Log

[2.0.0] - 2026-07-05

Added
* `runTasksUntilStableAsync` for async/await stabilization, Promise response getters, and async timer advancement.
* `predefinedHttpCallInstructionsAsync` for async HTTP instruction helpers.
* Public error exports for stabilization, HTTP instruction, and harness failures.
* Opportunity to run tests within zoneless environments.

Breaking changes
* The `ngx-testbox/testing` public API was narrowed to the supported black-box testing workflow.
* Previously exported low-level/manual HTTP utilities, including `completeHttpCalls`, are no longer part of the public API.
* Tests should now use one of the two stabilization approaches: `runTasksUntilStableAsync` for async/await tests, or `runTasksUntilStable` for `fakeAsync` suites.

Changed
* `runTasksUntilStable` is now the supported sync API for `fakeAsync` suites.
* The documentation and agent skill now present the library as two explicit testing approaches: async/await first, sync `fakeAsync` still supported.
* Package peer dependency minimum is Angular `>=15.0.0`.

Fixed
* Sync stabilization now reports Promise response getters with `CannotUsePromiseResponseWithinFakeAsync`.
* `runTasksUntilStable` now restores debug-mode timer instrumentation even when stabilization fails.

[1.2.0] - 2025-09-12

Changed
* `runTasksUntilStable` - PATCH now always tries to complete all pending HTTP requests, even if HTTP call instructions are not provided.
* `completeHttpCalls` - MINOR accepts optional field in the options object parameter - `testRequests`.

Fixed
* `runTasksUntilStable` - PATCH for the Angular version 17th and earlier ones.
  The issue was the fixture is still stable despite pending HTTP requests in the queue.
