/**
 * Thrown by both `runTasksUntilStable` and `runTasksUntilStableAsync` when
 * a `timeline` was set for an instruction but `timePassed` already exceeded it.
 *
 * Check timeline ordering; use `delay` instead if relative timing is sufficient.
 */
export class HttpInstructionTimelineExceededError extends Error {
  constructor(timeline: number, currentTime: number) {
    super(
      `The timeline ${timeline}ms for the HTTP instruction has already passed. Current time: ${currentTime}ms.`,
    );
  }
}
