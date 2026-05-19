import { HttpRequest, HttpResponse } from "@angular/common/http";


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
export type HttpCallInstruction = [HttpCallChecker, ResponseGetter] | [HttpCallChecker, ResponseGetter, DelayTime];

/**
 * A tuple containing an HTTP call checker and a response getter function.
 * Used to define how to handle specific HTTP requests during testing.
 */
export type HttpCallInstructionAsync = [HttpCallChecker, ResponseGetterAsync];