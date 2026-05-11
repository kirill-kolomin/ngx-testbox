export class LongRunningComponentError extends Error {
    constructor(longRunningTimeoutMs: number) {
        super(`Component was not able to stabilize for ${longRunningTimeoutMs}ms.`);
  }
}