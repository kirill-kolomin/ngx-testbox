export class NoMatchingHttpInstructionForRequestFoundError extends Error {
  constructor(requestUrl: string, requestMethod: string) {
    super(`No matching HTTP instruction found for request with URL "${requestUrl}" and method "${requestMethod}". Please ensure you've provided the correct HTTP call instructions for all expected requests.`);
  }
}
