import { HttpResponse } from '@angular/common/http';
import { FailedToGenerateHttpResponseError } from './errors/FailedToGenerateHttpResponseError';
import {
  EndpointPath,
  HttpCallInstructionAsync,
  ResponseGetterAsync,
} from './interfaces/http-call';
import { httpMethods, httpStatuses } from './predefined-http-call-instructions';

/**
 * Creates an async response getter function that returns HTTP responses with predefined status codes.
 *
 * This utility function simplifies the creation of response getters for the async/await testing approach
 * by automatically setting appropriate status codes and status text.
 *
 * @param status - Whether the response should indicate success ('success') or error ('error')
 * @param responseGetter - Optional function to generate the response body or a complete HttpResponse.
 *                         Can return a Promise.
 * @returns A ResponseGetterAsync function that generates HttpResponse objects with the appropriate status
 * @internal
 */
export const getPredefinedResponseGetterAsync = (
  status: 'success' | 'error',
  responseGetter?: (...args: Parameters<ResponseGetterAsync>) => Promise<HttpResponse<any> | any> | HttpResponse<any> | any,
): ResponseGetterAsync => {
  const statusCode = status === 'success' ? 200 : 500;
  const statusText = status === 'success' ? 'OK' : 'Internal Server Error';

  return async (...args: Parameters<ResponseGetterAsync>) => {
    let originalResponse: any;

    try {
      originalResponse = await responseGetter?.(...args);
    } catch (error) {
      throw new FailedToGenerateHttpResponseError(error);
    }

    // Check if originalResponse is an HttpResponse
    if (originalResponse instanceof HttpResponse) {
      return new HttpResponse({
        ...(originalResponse ? { body: originalResponse.body } : null),
        ...(originalResponse ? { headers: originalResponse.headers } : null),
        status: statusCode,
        statusText,
      });
    } else {
      // If it's not an HttpResponse, treat it as the response body
      return new HttpResponse({
        ...(originalResponse ? { body: originalResponse } : null),
        status: statusCode,
        statusText,
      });
    }
  };
};

/**
 * A collection of predefined async HTTP call instructions for different HTTP methods and status types.
 *
 * This object provides a convenient way to create HTTP call instructions for the async/await testing
 * approach without having to manually specify status codes and response formats.
 * It supports all common HTTP methods and both success and error responses.
 *
 * Use it with `runTasksUntilStableAsync`.
 *
 * Each method in the object is a function that takes next parameters:
 * - path - EndpointPath
 * - responseGetter - A callback that generates the response body. Can be async.
 *   As the first parameter, it receives the original HTTP request.
 *   As the second parameter, it receives the parsed URL search parameters from the request.
 *   It returns the body of the response.
 *
 * Each method in the object returns HttpCallInstructionAsync;
 *
 * @example
 * ```typescript
 * // Create a GET request with a success response
 * const getSuccess = predefinedHttpCallInstructionsAsync.get.success('api/users');
 *
 * // Create a POST request with an error response and custom response body
 * const postError = predefinedHttpCallInstructionsAsync.post.error('api/users',
 *   () => ({ error: 'User already exists' }));
 *
 * await runTasksUntilStableAsync(fixture, {httpCallInstructions: [getSuccess, postError]});
 * ```
 */
export const predefinedHttpCallInstructionsAsync = {} as Record<
  (typeof httpMethods)[number],
  Record<
    (typeof httpStatuses)[number],
    (path: EndpointPath, responseGetter?: (...args: Parameters<ResponseGetterAsync>) => Promise<unknown> | unknown) => HttpCallInstructionAsync
  >
>;

for (const httpMethod of httpMethods) {
  for (const status of httpStatuses) {
    predefinedHttpCallInstructionsAsync[httpMethod] = {
      ...predefinedHttpCallInstructionsAsync[httpMethod],
      [status]: (path: EndpointPath, responseGetter?: (...args: Parameters<ResponseGetterAsync>) => Promise<unknown> | unknown) => {
        return [
          [path, httpMethod.toUpperCase()],
          getPredefinedResponseGetterAsync(status, responseGetter),
        ];
      },
    };
  }
}
