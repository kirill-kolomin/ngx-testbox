import {TestBed} from '@angular/core/testing';
import {HttpTestingController, TestRequest} from '@angular/common/http/testing';
import {HttpRequest, HttpResponse} from '@angular/common/http';
import {FailedToGenerateHttpResponseError} from './errors/FailedToGenerateHttpResponseError';
import {NoMatchingHttpInstructionForRequestFoundError} from './errors/NoMatchingHttpInstructionForRequestFoundError';

/**
 * Represents an HTTP method (GET, POST, PUT, DELETE, etc.).
 */
export type HttpMethod = string;

/**
 * Represents an endpoint path that can be either a string or a regular expression.
 * - String: Exact or partial match for the URL
 * - RegExp: Pattern match for the URL
 */
export type EndpointPath = string | RegExp;

/**
 * A function that generates an HTTP response based on the request and URL search parameters.
 *
 * @param httpRequest - The original HTTP request
 * @param searchParams - The parsed URL search parameters from the request
 * @returns An HTTP response object to be returned for the request
 */
export type ResponseGetter = (httpRequest: HttpRequest<unknown>, searchParams: URLSearchParams) => HttpResponse<unknown>;

/**
 * A checker that determines if a specific HTTP request matches with a provided http call instruction for further handling.
 * Can be either:
 * - A function that takes an HTTP request and returns a boolean
 * - A tuple containing an endpoint path and HTTP method
 */
export type HttpCallChecker = ((httpRequest: HttpRequest<unknown>) => boolean) | [EndpointPath, HttpMethod];

/**
 * A tuple containing an HTTP call checker and a response getter function.
 * Used to define how to handle specific HTTP requests during testing.
 */
export type HttpCallInstruction = [HttpCallChecker, ResponseGetter]

/**
 * Retrieves all pending HTTP requests from the testing controller queue.
 *
 * @param httpTestingController - The HTTP testing controller instance (defaults to the one from TestBed)
 * @returns An array of TestRequest objects representing pending HTTP requests
 */
export const getRequestsFromQueue = (httpTestingController = TestBed.inject(HttpTestingController)): TestRequest[] => {
  return httpTestingController.match(() => true);
}

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
 * @throws Error if no matching instruction is found for a request
 */
export const completeHttpCalls = (httpCallInstructions: HttpCallInstruction[], {
  httpTestingController = TestBed.inject(HttpTestingController),
  testRequests
}: {
  httpTestingController?: HttpTestingController;
  testRequests?: TestRequest[];
} = {}) => {
  const requests = testRequests || getRequestsFromQueue(httpTestingController);

  for (let testRequest of requests) {
    if (testRequest.cancelled) {
      continue;
    }

    const {request} = testRequest;

    const instruction: HttpCallInstruction | undefined = httpCallInstructions.find(([checker]) => {
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

    const [_, responseGetter] = instruction;
    const urlSearchParams = extractSearchParams(request.urlWithParams);

    let response: HttpResponse<any>;
    try {
      response = responseGetter(request, urlSearchParams);
    } catch (error) {
      throw new FailedToGenerateHttpResponseError(error);
    }

    testRequest.flush(response.body as any, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  }
}

function extractSearchParams(requestUrl: string): URLSearchParams {
  const queryParams = requestUrl.split('?')[1];
  const urlSearchParams = new URLSearchParams(queryParams);

  return urlSearchParams;
}
