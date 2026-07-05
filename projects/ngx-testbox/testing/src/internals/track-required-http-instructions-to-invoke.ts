import { CallTrackers } from "../interfaces/call-trackers";
import { HttpCallInstruction, HttpCallInstructionAsync } from "../interfaces/http-call";
import { EnrichedHttpInstruction, EnrichedHttpInstructionAsync } from "./enriched-http-instruction";

/**
 * Creates trackers for HTTP call instructions to monitor which ones are invoked.
 *
 * This function wraps each response getter in the HTTP call instructions with a tracker
 * that records when the instruction is invoked.
 *
 * @param httpCallInstructions - Array of HTTP call instructions to track
 * @returns An object containing the modified HTTP call instructions and an array of call trackers
 * @returns.requiredHttpCallInstructions - The modified HTTP call instructions with tracking wrappers
 * @returns.callTrackers - Array of call trackers, each containing a function to check if the call was made
 * @internal
 */
export function trackRequiredHttpInstructionsToInvoke<T extends (EnrichedHttpInstruction | EnrichedHttpInstructionAsync)>(httpCallInstructions: (HttpCallInstruction | HttpCallInstructionAsync)[] = []): {
  requiredHttpCallInstructions: T[],
  callTrackers: CallTrackers
} {
  const callTrackers: CallTrackers = [];
  const requiredHttpCallInstructions: T[] = [];

  for (let httpCallInstruction of httpCallInstructions) {
    const [checker, getter, params] = httpCallInstruction;
    let wasCalled = false;

    const callTracker = () => {wasCalled = true};
    const markAsCancelled = () => {wasCalled = true};
    const checkWasCalled = () => wasCalled;
    const enrichedPayload = {
      ...params,
      callTracker,
      markAsCancelled ,
    };

    callTrackers.push([checkWasCalled, [checker, getter]]);
    requiredHttpCallInstructions.push([checker, getter, enrichedPayload] as T);
  }

  return {requiredHttpCallInstructions, callTrackers};
}
