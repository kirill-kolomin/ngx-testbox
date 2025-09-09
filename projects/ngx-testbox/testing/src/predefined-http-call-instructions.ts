import {EndpointPath, HttpCallInstruction, ResponseGetter} from './complete-http-calls';
import {HttpResponse} from '@angular/common/http';
import {FailedToGenerateHttpResponseError} from './errors/FailedToGenerateHttpResponseError';

/**
 * Creates a response getter function that returns HTTP responses with predefined status codes.
 *
 * This utility function simplifies the creation of response getters for testing by automatically
 * setting appropriate status codes and status text based on whether the response should indicate
 * success or error.
 *
 * @param status - Whether the response should indicate success ('success') or error ('error')
 * @param responseGetter - Optional function to generate the response body or a complete HttpResponse
 * @returns A ResponseGetter function that generates HttpResponse objects with the appropriate status
 */
export const getPredefinedResponseGetter = (status: 'success' | 'error', responseGetter?: (...args: Parameters<ResponseGetter>) => HttpResponse<any> | any): ResponseGetter => {
  const statusCode = status === 'success' ? 200 : 500;
  const statusText = status === 'success' ? 'OK' : 'Internal Server Error';

  return (...args: Parameters<ResponseGetter>) => {
    let originalResponse: any;

    try {
      originalResponse = responseGetter?.(...args);
    } catch (error) {
      throw new FailedToGenerateHttpResponseError(error)
    }

    // Check if originalResponse is an HttpResponse
    if (originalResponse instanceof HttpResponse) {
      return new HttpResponse({
        ...(originalResponse ? {body: originalResponse.body} : null),
        ...(originalResponse ? {headers: originalResponse.headers} : null),
        status: statusCode,
        statusText,
      });
    } else {
      // If it's not an HttpResponse, treat it as the response body
      return new HttpResponse({
        ...(originalResponse ? {body: originalResponse} : null),
        status: statusCode,
        statusText,
      });
    }
  };
}

export const httpMethods = ['head', 'options', 'get', 'post', 'put', 'patch', 'delete'] as const;
export const httpStatuses = ['success', 'error'] as const;

/**
 * A collection of predefined HTTP call instructions for different HTTP methods and status types.
 *
 * This object provides a convenient way to create HTTP call instructions for testing without
 * having to manually specify the status codes and response formats. It supports all common
 * HTTP methods and both success and error responses.
 *
 * Mainly you will use it with runTasksUntilStable.
 *
 * Each method in the object is a function that takes next parameters:
 * - path - EndpointPath
 * - responseGetter - A callback that generates the response body.
 * As the first parameter, it receives the original HTTP request.
 * As the second parameter, it receives the parsed URL search parameters from the request.
 * It returns the body of the response.
 *
 * Each method in the object returns HttpCallInstruction;
 *
 * @example
 * ```typescript
 * // Create a GET request with a success response
 * const getSuccess = predefinedHttpCallInstructions.get.success('api/users');
 *
 * // Create a POST request with an error response and custom response body
 * const postError = predefinedHttpCallInstructions.post.error('api/users',
 *   () => ({ error: 'User already exists' }));
 *
 * runTasksUntilStable(fixture, {httpCallInstructions: [getSuccess, postError]});
 * ```
 */
export const predefinedHttpCallInstructions = {} as Record<
  (typeof httpMethods)[number],
  Record<
    (typeof httpStatuses)[number],
    (path: EndpointPath, responseGetter?: (...args: Parameters<ResponseGetter>) => unknown) => HttpCallInstruction
  >
>;

for (let httpMethod of httpMethods) {
  for (let status of httpStatuses) {
    predefinedHttpCallInstructions[httpMethod] = {
      ...predefinedHttpCallInstructions[httpMethod],
      [status]: (path: EndpointPath, responseGetter?: (...args: Parameters<ResponseGetter>) => unknown) => {
        return [[path, httpMethod.toUpperCase()], getPredefinedResponseGetter(status, responseGetter)]
      }
    }
  }
}
