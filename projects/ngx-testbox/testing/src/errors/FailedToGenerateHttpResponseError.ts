export class FailedToGenerateHttpResponseError extends Error {
  constructor(genuineError: any) {
    super(`Check your responseGetter function. Failed to generate HTTP response: ${genuineError instanceof Error ? genuineError.message : 'Unknown error'}.`);
  }
}
