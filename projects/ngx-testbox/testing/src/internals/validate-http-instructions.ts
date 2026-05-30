import {
  HttpCallInstruction,
  HttpCallInstructionAsync,
  HttpCallInstructionExtraParams,
} from '../interfaces/http-call';
import { ConflictingHttpInstructionParamsError } from '../errors/ConflictingHttpInstructionParamsError';

function hasDelayAndTimelineDefined(params: HttpCallInstructionExtraParams): boolean {
  return params.delay !== undefined && params.timeline !== undefined;
}

export function validateHttpInstructions(
  httpCallInstructions: (HttpCallInstruction | HttpCallInstructionAsync)[],
): void {
  for (const instruction of httpCallInstructions) {
    const params = instruction[2];
    if (!params) continue;

    if (hasDelayAndTimelineDefined(params)) {
      throw new ConflictingHttpInstructionParamsError();
    }
  }
}
