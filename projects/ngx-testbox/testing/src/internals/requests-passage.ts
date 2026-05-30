import { TestRequest } from "@angular/common/http/testing";
import { HttpResponse } from "@angular/common/http";
import { CannotUsePromiseResponseWithinFakeAsync } from "../errors/CannotUsePromiseResponseWithinFakeAsync";
import { FailedToGenerateHttpResponseError } from "../errors/FailedToGenerateHttpResponseError";
import { HttpInstructionTimelineExceededError } from "../errors/HttpInstructionTimelineExceededError";
import { OnCompleted, ResponseGetter } from "../interfaces/http-call";
import { EnrichedHttpInstructionPayload } from "./enriched-http-instruction";
import { tick } from "@angular/core/testing";


export class RequestsPassageMediator {
    #timePassed = 0;
    #requests: Record<number, [TestRequest, ResponseGetter, EnrichedHttpInstructionPayload][]> = {};

    addRequest(httpRequest: TestRequest, responseGetter: ResponseGetter, instructionPayload: EnrichedHttpInstructionPayload): void {
        let key: number;

        if (instructionPayload.timeline !== undefined) {
            if (this.#timePassed > instructionPayload.timeline) {
                throw new HttpInstructionTimelineExceededError(instructionPayload.timeline, this.#timePassed);
            }
            key = instructionPayload.timeline;
        } else {
            const delay = instructionPayload.delay ?? 0;
            key = this.#timePassed + delay;
            if (key < this.#timePassed) {
                key = this.#timePassed;
            }
        }

        if(!this.#requests[key]) {
            this.#requests[key] = [[httpRequest, responseGetter, instructionPayload]];

        } else {
            this.#requests[key].push([httpRequest, responseGetter, instructionPayload]);
        }
    }

    passRequests(): {shouldStabilizeAfterRequests: boolean, asserts?: OnCompleted[]} {
        const key = Object.keys(this.#requests).sort((a, b) => Number(a) - Number(b))[0];

        if(!key) {
            return {shouldStabilizeAfterRequests: false};
        }

        const delay = Number(key) - this.#timePassed;
        const requests = this.#requests[Number(key)];
        const asserts: OnCompleted[] = [];

        if(delay > 0) {
            tick(delay);
        }

        for(let [testRequest, responseGetter, instructionPayload] of requests) {
            const {request} = testRequest;
            const urlSearchParams = extractSearchParams(request.urlWithParams);

            let response: HttpResponse<any>;
            try {
                const rawResponse = responseGetter(request, urlSearchParams);

                if(rawResponse instanceof Promise) {
                    throw new CannotUsePromiseResponseWithinFakeAsync();
                }

                response = rawResponse;
            } catch (error) {
                throw new FailedToGenerateHttpResponseError(error);
            }

            instructionPayload?.onCompleted ? asserts.push(instructionPayload.onCompleted) : void 0;

            if(testRequest.cancelled) {
                instructionPayload?.willHaveBeenCancelled ? instructionPayload.markAsCancelled() : void 0;
                continue;
            }

            testRequest.flush(response.body as any, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
            });
            instructionPayload.callTracker();
        }

        delete this.#requests[Number(key)];
        this.#timePassed = Number(key);

        return {shouldStabilizeAfterRequests: true, asserts};
    }
}


function extractSearchParams(requestUrl: string): URLSearchParams {
  const queryParams = requestUrl.split('?')[1];
  const urlSearchParams = new URLSearchParams(queryParams);

  return urlSearchParams;
}
