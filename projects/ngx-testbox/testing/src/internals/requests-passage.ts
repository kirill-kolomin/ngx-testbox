import { TestRequest } from "@angular/common/http/testing";
import { HttpResponse } from "@angular/common/http";
import { CannotUsePromiseResponseWithinFakeAsync } from "../errors/CannotUsePromiseResponseWithinFakeAsync";
import { FailedToGenerateHttpResponseError } from "../errors/FailedToGenerateHttpResponseError";
import { passTime } from "../pass-time";
import { Assert, HttpCallInstructionExtraParams, ResponseGetter } from "../interfaces/http-call";


export class RequestsPassageMediator {
    #timePassed = 0;
    #requests: Record<number, ([TestRequest, ResponseGetter] | [TestRequest, ResponseGetter, Assert])[]> = {};

    constructor(private debug = false) {}

    addRequest(httpRequest: TestRequest, responseGetter: ResponseGetter, extraParams?: HttpCallInstructionExtraParams): void {
        const delaySinceBeginning = extraParams?.delay ?? 0;
        const assert = extraParams?.assert;
        let delayDelta = delaySinceBeginning - this.#timePassed;
        
        if(this.debug && delayDelta < 0) {
            console.warn(`A request ${httpRequest.request.method} ${httpRequest.request.url} should have been called ${Math.abs(delayDelta)}ms ago. Probably you need to align your sequence of delays.`);
        }

        const key = delayDelta < 0 ? this.#timePassed : delaySinceBeginning;

        if(!this.#requests[key]) {
            this.#requests[key] = assert ? [[httpRequest, responseGetter, assert]] : [[httpRequest, responseGetter]];

        } else {
            this.#requests[key].push(assert ? [httpRequest, responseGetter, assert] : [httpRequest, responseGetter]);
        }
    }

    passRequests(): {shouldStabilizeAfterRequests: boolean, asserts?: Assert[]} {
        const key = Object.keys(this.#requests).sort((a, b) => Number(a) - Number(b))[0];

        if(!key) {
            return {shouldStabilizeAfterRequests: false};
        }

        const delay = Number(key) - this.#timePassed;
        const requests = this.#requests[Number(key)];
        const asserts: Assert[] = [];

        if(delay > 0) {
            passTime(delay);
        }

        for(let [testRequest, responseGetter, assert] of requests) {
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

            testRequest.flush(response.body as any, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
            });

            assert ? asserts.push(assert) : void 0;
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