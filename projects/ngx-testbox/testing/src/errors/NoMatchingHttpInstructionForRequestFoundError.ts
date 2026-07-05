/**
 * Thrown by both `runTasksUntilStable` and `runTasksUntilStableAsync` when an
 * HTTP request was made that did not match any instruction in `httpCallInstructions`.
 *
 * Add the missing instruction, or verify URL and method match your component's request.
 */
export class NoMatchingHttpInstructionForRequestFoundError extends Error {
  constructor(requestUrl: string, requestMethod: string) {
    super(`No matching HTTP instruction found for request with URL "${requestUrl}" and method "${requestMethod}". Please ensure you've provided the correct HTTP call instructions for all expected requests.`);
  }
}
