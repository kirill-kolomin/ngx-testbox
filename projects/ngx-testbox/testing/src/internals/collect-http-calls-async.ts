import { TestBed } from '@angular/core/testing';
import { HttpTestingController, TestRequest } from '@angular/common/http/testing';
import { NoMatchingHttpInstructionForRequestFoundError } from '../errors/NoMatchingHttpInstructionForRequestFoundError';
import { getRequestsFromQueue } from './get-requests-from-queue';
import { type RequestsPassageMediatorAsync } from './requests-passage-async';
import { EnrichedHttpInstructionAsync } from './enriched-http-instruction';

// Kept as an internal file; mediator is exported via requests-passage-async-public to avoid changing internal module graph.
export const collectHttpCallsAsync = (
  httpCallInstructions: EnrichedHttpInstructionAsync[],
  requestsPassageMediator: RequestsPassageMediatorAsync,
  {
    httpTestingController = TestBed.inject(HttpTestingController),
    testRequests,
  }: {
    httpTestingController?: HttpTestingController;
    testRequests?: TestRequest[];
  } = {},
) => {
  const requests = testRequests || getRequestsFromQueue(httpTestingController);

  for (const testRequest of requests) {
    if (testRequest.cancelled) {
      continue;
    }

    const { request } = testRequest;

    const instruction = httpCallInstructions.find(([checker]) => {
      if (typeof checker === 'function') {
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

    if (instruction === undefined) {
      throw new NoMatchingHttpInstructionForRequestFoundError(request.url, request.method);
    }

    const [, responseGetter, options] = instruction;
    requestsPassageMediator.addRequest(testRequest, responseGetter, options);
  }
};
