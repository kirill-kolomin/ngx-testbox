import { HttpInstructionWasNotExecutedDuringFixtureStabilizationError } from "../errors/HttpInstructionWasNotExecutedDuringFixtureStabilizationError";
import { CallTrackers } from "../interfaces/call-trackers";

/**
 * Checks if all HTTP call instructions were invoked and throws an error if any were not.
 *
 * This function is called after stabilization to ensure that all expected HTTP calls
 * were actually made during the process.
 *
 * @param callTrackers - Array of call trackers to check
 * @throws Error if any HTTP call instruction was not invoked
 * @internal
 */
export function throwIfThereIsHttpInstructionNotInvoked(callTrackers: CallTrackers) {
  for (let index = 0; index < callTrackers.length; index++) {
    const callTracker = callTrackers[index];

    if (!callTracker[0]()) {
      throw new HttpInstructionWasNotExecutedDuringFixtureStabilizationError(index, callTracker[1].toString());
    }
  }
}