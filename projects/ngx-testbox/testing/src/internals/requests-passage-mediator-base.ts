import { TestBed } from "@angular/core/testing";
import { HttpTestingController, TestRequest } from "@angular/common/http/testing";
import { NoMatchingHttpInstructionForRequestFoundError } from "../errors/NoMatchingHttpInstructionForRequestFoundError";
import { getRequestsFromQueue } from "./get-requests-from-queue";
import { EnrichedHttpInstruction, EnrichedHttpInstructionAsync, EnrichedHttpInstructionPayload } from "./enriched-http-instruction";
import { HttpInstructionTimelineExceededError } from "../errors/HttpInstructionTimelineExceededError";
import type { ResponseGetter, ResponseGetterAsync } from "../interfaces/http-call";

export class RequestsPassageMediator<
  RG extends ResponseGetter | ResponseGetterAsync,
  Instr extends EnrichedHttpInstruction | EnrichedHttpInstructionAsync,
> {
  protected timePassed = 0;
  protected requests: Record<number, [TestRequest, RG, EnrichedHttpInstructionPayload][]> = {};

  collectHttpCalls(
    httpCallInstructions: Instr[],
    {
      httpTestingController = TestBed.inject(HttpTestingController),
      testRequests,
    }: {
      httpTestingController?: HttpTestingController;
      testRequests?: TestRequest[];
    } = {},
  ) {
    console.log('collect', testRequests)
    const requests = testRequests || getRequestsFromQueue(httpTestingController);

    for (const testRequest of requests) {
      if (testRequest.cancelled) {
        continue;
      }

      const { request } = testRequest;

      const instructionIndex = httpCallInstructions.findIndex(([checker]) => {
        if (typeof checker === "function") {
          return checker(request);
        }
        if (Array.isArray(checker)) {
          const path = checker[0];
          const method = checker[1];

          if (path instanceof RegExp) {
            return request.url.match(path) && request.method === method;
          }
          return request.url.includes(path) && request.method === method;
        }
        return false;
      });

      console.log(request.url, instructionIndex)
      if (instructionIndex === -1) {
        throw new NoMatchingHttpInstructionForRequestFoundError(request.url, request.method);
      }

      const instruction = httpCallInstructions[instructionIndex];

      if(!instruction[2].sustainable) {
        httpCallInstructions.splice(instructionIndex, 1);
      }

      const [, responseGetter, options] = instruction;
      this.#registerRequest(testRequest, responseGetter as RG, options);
    }
  }

  protected extractSearchParams(requestUrl: string): URLSearchParams {
    const queryParams = requestUrl.split("?")[1];
    return new URLSearchParams(queryParams);
  }

  #registerRequest(httpRequest: TestRequest, responseGetter: RG, instructionPayload: EnrichedHttpInstructionPayload): void {
    let key: number;

    if (instructionPayload.timeline !== undefined) {
      if (this.timePassed > instructionPayload.timeline) {
        console.log('HttpInstructionTimelineExceededError')
        throw new HttpInstructionTimelineExceededError(instructionPayload.timeline, this.timePassed);
      }
      key = instructionPayload.timeline;
    } else {
      const delay = instructionPayload.delay ?? 0;
      key = this.timePassed + delay;
      if (key < this.timePassed) {
        key = this.timePassed;
      }
    }

    if (!this.requests[key]) {
      this.requests[key] = [[httpRequest, responseGetter, instructionPayload]];
    } else {
      this.requests[key].push([httpRequest, responseGetter, instructionPayload]);
    }
  }
}
