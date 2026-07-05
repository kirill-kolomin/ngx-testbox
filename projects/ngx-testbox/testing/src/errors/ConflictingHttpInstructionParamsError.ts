/**
 * Thrown by both `runTasksUntilStable` and `runTasksUntilStableAsync` when
 * both `delay` and `timeline` were specified on the same instruction.
 *
 * Remove one of the conflicting parameters.
 */
export class ConflictingHttpInstructionParamsError extends Error {
  constructor() {
    super("HTTP instruction cannot have both 'delay' and 'timeline' parameters.");
  }
}
