import { HttpResponse } from '@angular/common/http';
import { FailedToGenerateHttpResponseError } from '../errors/FailedToGenerateHttpResponseError';
import { OnCompleted, ResponseGetterAsync } from '../interfaces/http-call';
import { RequestsPassageMediator } from './requests-passage-mediator-base';
import { EnrichedHttpInstructionAsync } from './enriched-http-instruction';

export class RequestsPassageMediatorAsync extends RequestsPassageMediator<ResponseGetterAsync, EnrichedHttpInstructionAsync> {
  async passRequests(
    advanceTimers?: (delayMs: number) => void | Promise<void>,
  ): Promise<{ shouldStabilizeAfterRequests: boolean; asserts?: OnCompleted[] }> {
    const key = Object.keys(this.requests)
      .sort((a, b) => Number(a) - Number(b))[0];

    if (!key) {
      return { shouldStabilizeAfterRequests: false };
    }

    const delay = Number(key) - this.timePassed;
    const requests = this.requests[Number(key)];
    const asserts: OnCompleted[] = [];

    if (delay > 0) {
      if (advanceTimers) {
        await advanceTimers(delay);
      } else {
        await new Promise((r) => setTimeout(r, delay));
      }
    }

    for (const [testRequest, responseGetter, instructionPayload] of requests) {
      const { request } = testRequest;
      const urlSearchParams = this.extractSearchParams(request.urlWithParams);

      let response: HttpResponse<any>;
      try {
        response = await responseGetter(request, urlSearchParams);
      } catch (error) {
        throw new FailedToGenerateHttpResponseError(error);
      }

      if (instructionPayload?.onCompleted) {
        asserts.push(instructionPayload.onCompleted);
      }

      if (testRequest.cancelled) {
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

    return { shouldStabilizeAfterRequests: true, asserts };
  }
}
