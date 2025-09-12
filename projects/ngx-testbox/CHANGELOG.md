# Change Log

[1.2.0] - 2025-09-12

Changed
* `runTasksUntilStable` - PATCH now always tries to complete all pending HTTP requests, even if HTTP call instructions are not provided.
* `completeHttpCalls` - MINOR accepts optional field in the options object parameter - `testRequests`.

Fixed
* `runTasksUntilStable` - PATCH for the Angular version 17th and earlier ones.
  The issue was the fixture is still stable despite pending HTTP requests in the queue.
