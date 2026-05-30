export class ConflictingHttpInstructionParamsError extends Error {
  constructor() {
    super("HTTP instruction cannot have both 'delay' and 'timeline' parameters.");
  }
}
