/**
 * Thrown by both `runTasksUntilStable` and `runTasksUntilStableAsync` when
 * the `responseGetter` function threw an exception while generating a response.
 *
 * Fix the response getter logic so it does not throw.
 */
export class FailedToGenerateHttpResponseError extends Error {
  constructor(genuineError: any) {
    super(`Check your responseGetter function. Failed to generate HTTP response: ${genuineError instanceof Error ? genuineError.message : 'Unknown error'}.`);
  }
}
