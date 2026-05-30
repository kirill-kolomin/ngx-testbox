import { HttpRequest, HttpResponse } from "@angular/common/http";

/**
 * OnCompleted function that is called after an http instruction was processed.
 * Note it doesn't wait for the fixture stability to run the callback, more likely there are ongoing async operations.
 */
export type OnCompleted = () => void;

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
export type ResponseGetter = (httpRequest: HttpRequest<unknown>, searchParams: URLSearchParams) => HttpResponse<any>;

/**
 * A function that generates an HTTP response based on the request and URL search parameters.
 *
 * @param httpRequest - The original HTTP request
 * @param searchParams - The parsed URL search parameters from the request
 * @returns An HTTP response object to be returned for the request
 */
export type ResponseGetterAsync = (httpRequest: HttpRequest<unknown>, searchParams: URLSearchParams) => Promise<HttpResponse<any>> | HttpResponse<any>;

/*
    Milliseconds of delay time for fakeAsync requests.
*/
export type DelayTime = number;

/*
   Milliseconds of absolute timeline time.
*/
export type TimelineTime = number;

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
export type HttpCallInstruction = [HttpCallChecker, ResponseGetter] | [HttpCallChecker, ResponseGetter, HttpCallInstructionExtraParams];

/**
 * A tuple containing an HTTP call checker and a response getter function.
 * Used to define how to handle specific HTTP requests during testing.
 */
export type HttpCallInstructionAsync =
  | [HttpCallChecker, ResponseGetterAsync]
  | [HttpCallChecker, ResponseGetterAsync, HttpCallInstructionExtraParams];

export type HttpCallInstructionExtraParams = {
  delay?: DelayTime;
  timeline?: TimelineTime;
  onCompleted?: OnCompleted;
  willHaveBeenCancelled?: boolean;
  /**
   * Each http instruction by default is handled only 1 time, then disappear.
   * Marking it sustainable makes it executable accross all http requests for the current fixture stabilization process.
   */
  sustainable?: boolean;
};
