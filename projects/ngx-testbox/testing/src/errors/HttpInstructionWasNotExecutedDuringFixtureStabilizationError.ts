export class HttpInstructionWasNotExecutedDuringFixtureStabilizationError extends Error {
  constructor(index: number, instruction: string) {
    super(
      `An HTTP call instruction was not executed during test stabilization at index ${index}.
      This may indicate that the expected HTTP request was never made by your component,
      or that the request was made with different parameters than expected.
      Check that your component is correctly triggering this HTTP request and that
      the URL and method in your test instructions match what your component is requesting.
      The http instruction is -> ${instruction}`
    );
  }
}
