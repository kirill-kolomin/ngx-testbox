import { HttpCallInstruction, ResponseGetter } from "../complete-http-calls";
import { CallTrackers } from "../interfaces/call-trackers";

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
export function trackRequiredHttpInstructionsToInvoke(_httpCallInstructions: HttpCallInstruction[] = []): {
  requiredHttpCallInstructions: HttpCallInstruction[],
  callTrackers: CallTrackers
} {
  const callTrackers: CallTrackers = [];
  const httpCallInstructions = _httpCallInstructions.slice()

  for (let httpCallInstruction of httpCallInstructions) {
    let wasCalled = false;
    const responseGetter = httpCallInstruction[1];

    const tracker: ResponseGetter = function (...args: Parameters<ResponseGetter>) {
      wasCalled = true;
      return responseGetter(...args);
    }
    const checkWasCalled = () => wasCalled;

    callTrackers.push([checkWasCalled, [httpCallInstruction[0], responseGetter]])
    httpCallInstruction[1] = tracker;
  }

  return {requiredHttpCallInstructions: httpCallInstructions, callTrackers};
}