/**
 * Thrown by `runTasksUntilStableAsync` when the component did not stabilize
 * within `componentLongRunTimeout` (default: 10000 ms).
 *
 * Increase `componentLongRunTimeout`, or check for leaked timers / `setInterval`.
 */
export class LongRunningComponentError extends Error {
    constructor(longRunningTimeoutMs: number) {
        super(`Component was not able to stabilize for ${longRunningTimeoutMs}ms.`);
  }
}