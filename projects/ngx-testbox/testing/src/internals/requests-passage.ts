import { HttpResponse } from "@angular/common/http";
import { CannotUsePromiseResponseWithinFakeAsync } from "../errors/CannotUsePromiseResponseWithinFakeAsync";
import { FailedToGenerateHttpResponseError } from "../errors/FailedToGenerateHttpResponseError";
import { OnCompleted, ResponseGetter } from "../interfaces/http-call";
import { tick } from "@angular/core/testing";
import { RequestsPassageMediator } from "./requests-passage-mediator-base";
import { EnrichedHttpInstruction } from "./enriched-http-instruction";

export class RequestsPassageMediatorSync extends RequestsPassageMediator<ResponseGetter, EnrichedHttpInstruction> {
    passRequests(): {shouldStabilizeAfterRequests: boolean, asserts?: OnCompleted[]} {
        const key = Object.keys(this.requests).sort((a, b) => Number(a) - Number(b))[0];
console.log(this.requests, Object.keys(this.requests).sort((a, b) => Number(a) - Number(b)))
        if(!key) {
            return {shouldStabilizeAfterRequests: false};
        }

        const delay = Number(key) - this.timePassed;
        const requests = this.requests[Number(key)];
        const asserts: OnCompleted[] = [];

        if(delay > 0) {
            tick(delay);
        }

        for(let [testRequest, responseGetter, instructionPayload] of requests) {
            const {request} = testRequest;
            const urlSearchParams = this.extractSearchParams(request.urlWithParams);

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

        delete this.requests[Number(key)];
        this.timePassed = Number(key);
        console.log('nowa timeline is ', this.timePassed)

        return {shouldStabilizeAfterRequests: true, asserts};
    }
}
