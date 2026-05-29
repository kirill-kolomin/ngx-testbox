import { TestRequest } from '@angular/common/http/testing';
import { HttpResponse } from '@angular/common/http';
import { FailedToGenerateHttpResponseError } from '../errors/FailedToGenerateHttpResponseError';
import { OnCompleted, ResponseGetterAsync } from '../interfaces/http-call';
import { EnrichedHttpInstructionPayload } from './enriched-http-instruction';

export class RequestsPassageMediatorAsync {
  #timePassed = 0;
  #requests: Record<number, [TestRequest, ResponseGetterAsync, EnrichedHttpInstructionPayload][]> = {};

  constructor(private debug = false) {}

  addRequest(
    httpRequest: TestRequest,
    responseGetter: ResponseGetterAsync,
    instructionPayload: EnrichedHttpInstructionPayload,
  ): void {
    const delaySinceBeginning = instructionPayload?.delay ?? 0;
    const delayDelta = delaySinceBeginning - this.#timePassed;

    if (this.debug && delayDelta < 0) {
      console.warn(
        `A request ${httpRequest.request.method} ${httpRequest.request.url} should have been called ${Math.abs(
          delayDelta,
        )}ms ago. Probably you need to align your sequence of delays.`,
      );
    }

    const key = delayDelta < 0 ? this.#timePassed : delaySinceBeginning;

    if (!this.#requests[key]) {
      this.#requests[key] = [[httpRequest, responseGetter, instructionPayload]];
    } else {
      this.#requests[key].push([httpRequest, responseGetter, instructionPayload]);
    }
  }

  async passRequests(
    advanceTimers?: (delayMs: number) => void | Promise<void>,
  ): Promise<{ shouldStabilizeAfterRequests: boolean; asserts?: OnCompleted[] }> {
    const key = Object.keys(this.#requests)
      .sort((a, b) => Number(a) - Number(b))[0];

    if (!key) {
      return { shouldStabilizeAfterRequests: false };
    }

    const delay = Number(key) - this.#timePassed;
    const requests = this.#requests[Number(key)];
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
      const urlSearchParams = extractSearchParams(request.urlWithParams);

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

    delete this.#requests[Number(key)];
    this.#timePassed = Number(key);

    return { shouldStabilizeAfterRequests: true, asserts };
  }
}

function extractSearchParams(requestUrl: string): URLSearchParams {
  const queryParams = requestUrl.split('?')[1];
  return new URLSearchParams(queryParams);
}
