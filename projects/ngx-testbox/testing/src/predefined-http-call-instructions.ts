import {EndpointPath, HttpCallInstruction, ResponseGetter} from './complete-http-calls';
import {HttpResponse} from '@angular/common/http';

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
      console.error('Error in responseGetter function:', error);
      throw new Error(`Failed to generate HTTP response: ${error instanceof Error ? error.message : 'Unknown error'}. Check your responseGetter function.`);
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
 * @example
 * ```typescript
 * // Create a GET request with a success response
 * const getSuccess = predefinedHttpCallInstructions.get.success('api/users');
 *
 * // Create a POST request with an error response and custom response body
 * const postError = predefinedHttpCallInstructions.post.error('api/users',
 *   () => ({ error: 'User already exists' }));
 *
 * // Use with runTasksUntilStable
 * runTasksUntilStable(fixture, {httpCallInstructions: [getSuccess, postError]});
 * ```
 *
 * In exception cases, when runTasksUntilStable is not enough, you can use completeHttpCalls.
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
 * // Use with completeHttpCalls
 * completeHttpCalls([getSuccess, postError]);
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
