import { HttpCallChecker, HttpCallInstructionExtraParams, ResponseGetter, ResponseGetterAsync } from "../interfaces/http-call";

export type EnrichedHttpInstructionPayload = HttpCallInstructionExtraParams & {
    callTracker: () => void;
    markAsCancelled: () => void;
};

export type EnrichedHttpInstruction = [HttpCallChecker, ResponseGetter, EnrichedHttpInstructionPayload];

export type EnrichedHttpInstructionAsync = [HttpCallChecker, ResponseGetterAsync, EnrichedHttpInstructionPayload];
