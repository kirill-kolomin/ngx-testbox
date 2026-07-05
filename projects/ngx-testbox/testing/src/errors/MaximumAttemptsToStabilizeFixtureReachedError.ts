/**
 * Thrown by `runTasksUntilStable` when the stabilization loop exceeded `maxAttempts`
 * (default: 30).
 *
 * Usually caused by continuous asynchronous operations like `setInterval`.
 * Mock `setInterval` or run it outside Angular zone. Use `debug: true` to locate it.
 */
export class MaximumAttemptsToStabilizeFixtureReachedError extends Error {
  constructor(maximumAttempts: number) {
    super(
      `Maximum stabilization attempts (${maximumAttempts}) reached. The fixture could not be stabilized.
      This may be caused by continuous asynchronous operations like setInterval, or other ongoing processes.
      Check for setInterval calls in your component and consider mocking them or running them outside Angular zone.`
    );
  }
}
