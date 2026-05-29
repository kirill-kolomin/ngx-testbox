import {TestBed} from '@angular/core/testing';
import {HttpTestingController, TestRequest} from '@angular/common/http/testing';
import {NoMatchingHttpInstructionForRequestFoundError} from '../../errors/NoMatchingHttpInstructionForRequestFoundError';
import {  HttpCallInstruction } from '../../interfaces/http-call';
import { getRequestsFromQueue } from '../../internals/get-requests-from-queue';
import { type RequestsPassageMediator } from '../../internals/requests-passage';
import { EnrichedHttpInstruction } from '../../internals/enriched-http-instruction';

/**
 * Completes all HTTP calls that are in the queue and processes all subsequent tasks.
 * This function only handles HTTP requests that were scheduled using the Angular HttpClient.
 *
 * For each request in the queue, it finds a matching instruction from the provided array
 * and uses it to generate and flush an appropriate response.
 *
 * @param httpCallInstructions - An array of instructions defining how to handle specific HTTP requests
 * @param options - Optional configuration options
 * @param options.httpTestingController - The HTTP testing controller instance (defaults to the one from TestBed)
 * @param options.testRequests - The HTTP requests to be handled. If not provided, it will use the queue from the testing controller.
 * @throws Error if no matching instruction is found for a request
 */
export const collectHttpCalls = (
  httpCallInstructions: EnrichedHttpInstruction[], 
  requestsPassageMediator: RequestsPassageMediator, 
  {
    httpTestingController = TestBed.inject(HttpTestingController),
    testRequests,
  }: {
    httpTestingController?: HttpTestingController;
    testRequests?: TestRequest[];
  } = {}
) => {
  const requests = [...(testRequests || []), ...getRequestsFromQueue(httpTestingController)];

  for (let testRequest of requests) {
    if (testRequest.cancelled) {
      continue;
    }

    const {request} = testRequest;

    const instruction: EnrichedHttpInstruction | undefined = httpCallInstructions.find(([checker]) => {
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
    })

    if (instruction === undefined) {
      throw new NoMatchingHttpInstructionForRequestFoundError(request.url, request.method);
    }

    const [_, responseGetter, options] = instruction;
    requestsPassageMediator.addRequest(testRequest, responseGetter, options);
  }
}
