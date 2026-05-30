export class HttpInstructionTimelineExceededError extends Error {
  constructor(timeline: number, currentTime: number) {
    super(
      `The timeline ${timeline}ms for the HTTP instruction has already passed. Current time: ${currentTime}ms.`,
    );
  }
}
