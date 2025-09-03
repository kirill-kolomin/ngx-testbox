export class MaximumAttemptsToStabilizeFixtureReachedError extends Error {
  constructor(maximumAttempts: number) {
    super(
      `Maximum stabilization attempts (${maximumAttempts}) reached. The fixture could not be stabilized.
      This may be caused by continuous asynchronous operations like setInterval, or other ongoing processes.
      Check for setInterval calls in your component and consider mocking them or running them outside Angular zone.`
    );
  }
}
