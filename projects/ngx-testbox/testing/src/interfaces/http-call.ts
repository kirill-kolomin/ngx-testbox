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
  /**
   * Virtual/real delay before responding (in milliseconds).
   * In `fakeAsync`, this translates to a `tick()` call.
   * In async mode, this uses a real `setTimeout` or is passed to the `advanceTimers` callback.
   */
  delay?: DelayTime;
  /**
   * Absolute timeline time point for the response (in milliseconds), starting to count separately for each stabilization call.
   * If time passed since a stabilization call is greater than the timeline,
   * an `HttpInstructionTimelineExceededError` is thrown.
   */
  timeline?: TimelineTime;
  /**
   * Callback invoked after the instruction is processed.
   * Useful for intermediate assertions between request rounds or making DOM interactions clicking, focusing, etc.
   */
  onCompleted?: OnCompleted;
  /**
   * Marks the request as expected to be cancelled (e.g. by `switchMap`).
   * The instruction is considered "invoked" even if the request is cancelled.
   */
  willHaveBeenCancelled?: boolean;
  /**
   * Each HTTP instruction by default is handled only once, then disappears.
   * Marking it `sustainable: true` makes it executable across all HTTP requests
   * for the current fixture stabilization process.
   */
  sustainable?: boolean;
};
