import { TestRequest } from "@angular/common/http/testing";
import { HttpResponse } from "@angular/common/http";
import { CannotUsePromiseResponseWithinFakeAsync } from "../errors/CannotUsePromiseResponseWithinFakeAsync";
import { FailedToGenerateHttpResponseError } from "../errors/FailedToGenerateHttpResponseError";
import { passTime } from "../pass-time";
import { OnCompleted, ResponseGetter } from "../interfaces/http-call";
import { EnrichedHttpInstructionPayload } from "./enriched-http-instruction";


export class RequestsPassageMediator {
    #timePassed = 0;
    #requests: Record<number, [TestRequest, ResponseGetter, EnrichedHttpInstructionPayload][]> = {};

    constructor(private debug = false) {}

    addRequest(httpRequest: TestRequest, responseGetter: ResponseGetter, instructionPayload: EnrichedHttpInstructionPayload): void {
        const delaySinceBeginning = instructionPayload?.delay ?? 0;
        let delayDelta = delaySinceBeginning - this.#timePassed;
        
        if(this.debug && delayDelta < 0) {
            console.warn(`A request ${httpRequest.request.method} ${httpRequest.request.url} should have been called ${Math.abs(delayDelta)}ms ago. Probably you need to align your sequence of delays.`);
        }

        const key = delayDelta < 0 ? this.#timePassed : delaySinceBeginning;

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
            passTime(delay);
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