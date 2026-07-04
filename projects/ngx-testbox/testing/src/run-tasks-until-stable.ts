import {ComponentFixture, TestBed, tick} from '@angular/core/testing';

import {HttpErrorResponse} from '@angular/common/http';
import {MaximumAttemptsToStabilizeFixtureReachedError} from './errors/MaximumAttemptsToStabilizeFixtureReachedError';
import {HttpTestingController} from '@angular/common/http/testing';
import { CommonStabilizationParams } from './interfaces/common-stabilization-params';
import { trackRequiredHttpInstructionsToInvoke } from './internals/track-required-http-instructions-to-invoke';
import { throwIfThereIsHttpInstructionNotInvoked } from './internals/throw-if-there-is-http-instrcution-not-invoked';
import { patchSetInterval } from './internals/patch-set-interval';
import { getRequestsFromQueue } from './internals/get-requests-from-queue';
import { RequestsPassageMediatorSync } from './internals/requests-passage';
import { HttpCallInstruction } from './interfaces/http-call';
import { EnrichedHttpInstruction } from './internals/enriched-http-instruction';
import { validateHttpInstructions } from './internals/validate-http-instructions';

/**
 * Configuration parameters for the runTasksUntilStable function.
 *
 * @interface RunTasksUntilStableParams
 */
export interface RunTasksUntilStableParams extends CommonStabilizationParams {
  /**
   * Array of HTTP call instructions to process during stabilization.
   * These instructions define how to handle specific HTTP requests.
   */
  httpCallInstructions?: HttpCallInstruction[];

  /**
   * The amount of time in milliseconds to advance the virtual clock on each stabilization attempt.
   * This time advance is cumulative across attempts and runs even when there are no pending HTTP requests,
   * helping the fixture settle timer-driven work such as debounce or throttle timeouts.
   *
   * Defaults to **0**.
   */
  stabilizationTimeAdvance?: number;

  /**
   * Maximum number of attempts to stabilize the fixture before throwing an error.
   * This prevents infinite loops when a fixture cannot be stabilized.
   *
   * Defaults to **30**.
   */
  maxAttempts?: number;
}

/**
 * Maximum number of attempts to stabilize the fixture before throwing an error.
 * This prevents infinite loops when a fixture cannot be stabilized.
 */
const MAXIMUM_ATTEMPTS = 30;

/**
 * Runs Angular change detection and processes tasks until the component fixture is stable.
 * **This function is designed to work only within a `fakeAsync` zone.**
 * It is the core functionality of the ngx-testbox library for the sync/fakeAsync approach.
 *
 * It does the following operations:
 * 1. Runs change detection.
 * 2. Responds to HTTP requests.
 * 3. Pushes time forward. Executes until all asynchronous operations are resolved so that the fixture becomes stable.
 * 4. Runs the cycle again until the fixture is stable.
 *
 * @example
 * ```typescript
 * // In a fakeAsync test
 * runTasksUntilStable(fixture);
 *
 * // With HTTP call instructions
 * runTasksUntilStable(fixture, {
 *   httpCallInstructions: [
 *     [['api/users', 'GET'], () => new HttpResponse({ body: users, status: 200 })]
 *   ]
 * });
 * ```
 *
 * @param fixture - The component fixture to stabilize
 * @param params - Optional configuration parameters
 * @throws {MaximumAttemptsToStabilizeFixtureReachedError} if the fixture cannot be stabilized after the configured maxAttempts (default: 30)
 * @throws {HttpInstructionWasNotExecutedDuringFixtureStabilizationError} if any HTTP instruction is not invoked during stabilization
 * @throws {NoMatchingHttpInstructionForRequestFoundError} if any HTTP request is not handled during stabilization
 * @throws {CannotUsePromiseResponseWithinFakeAsync} if a sync response getter returns a Promise
 *
 * @remarks
 *
 * - This function is designed to work only within fakeAsync zone within the "zoneful" Angular app. Not for zoneless apps.
 * - When you created a component using the method createComponent of fixture, the fixture is marked as stable, if you don't run any asynchronous tasks within the component constructor or within its dependencies.
 *   Make sure you set everything up (did overrides to methods, passed values to inputs, etc.), as you need to call this function to run the Angular component's life cycle.
 *   Once you called it, the ngOnInit method will be invoked, and the fixture now is in status unstable.
 * - This function processes only http requests, which were made using Angular http client.
 * - To guarantee that your passed http call instructions will be invoked, the function will throw if some of them were not invoked during stabilization.
 *   E.g., this is useful for cases when you initialize your component with some data as the initial state, and your test case covers error responses, which preserve the initial state still.
 *   Though visually nothing happened for users, but as for you as a developer, you wanted to make sure that your component is not broken after the error response.
 * - And vice versa, if you didn't process any of the HTTP requests that entered the queue of tasks, the function will throw an error.
 *   So it helps you to cover that piece of code which you expect to cover.
 *   For cases with side effects as HTTP calls, I recommend overriding such methods with stubs.
 * - When in your code you have used setInterval calls, potentially this may be a problem for stabilizing the fixture.
 *   In this case you might need to mock the place where setInterval is invoked or run the piece of code outside the angular zone using the NgZone.prototype.runOutsideAngular method.
 *   Additionally, you will receive warnings in the console log if setInterval is detected with stack trace pointing you to easier find the place where setInterval is invoked.
 *
 * Note: Potentially will be deprecated if Angular team decides to deprecate fakeAsync and zone.js in their future releases.
 * Use runTasksUntilStableAsync and its componentLongRunTimeout parameter for the new async/await approach instead.
 */
export const runTasksUntilStable = (fixture: ComponentFixture<unknown>, {
  stabilizationTimeAdvance,
  httpCallInstructions = [],
  debug,
  maxAttempts,
}: RunTasksUntilStableParams = {}) => {
  const _maxAttempts = maxAttempts ?? MAXIMUM_ATTEMPTS;
  const _httpCallInstructions = httpCallInstructions.slice();
  const _stabilizationTimeAdvance = stabilizationTimeAdvance ?? 0;
  validateHttpInstructions(_httpCallInstructions);

  let rollbackOriginalSetInterval = () => {};

  if(debug) {
    rollbackOriginalSetInterval = patchSetInterval();
  }

  const httpTestingController = TestBed.inject(HttpTestingController);

  let attempt = 0;
  const {callTrackers, requiredHttpCallInstructions} = trackRequiredHttpInstructionsToInvoke<EnrichedHttpInstruction>(_httpCallInstructions);
  let requests = getRequestsFromQueue(httpTestingController);
  const requestsPassageMediator = new RequestsPassageMediatorSync();

  // Triggers the ngOnInit to mark the fixture as unstable right after the component is created.
  fixture.detectChanges();

  try {
    // By an unknown reason angular Zone is still stable despite having requests in the queue. So I need to look to make the check if there is requests in the queue.
    while (!fixture.isStable() || requests.length > 0) {
      if (attempt++ > _maxAttempts) {
        throw new MaximumAttemptsToStabilizeFixtureReachedError(_maxAttempts)
      }

      requestsPassageMediator.collectHttpCalls(requiredHttpCallInstructions, {testRequests: requests});
      requests = [];
      let passRequestsResult = requestsPassageMediator.passRequests();
      
      while(passRequestsResult.shouldStabilizeAfterRequests) {
        fixture.detectChanges();

        try {
          tick();
        } catch (error) {
          if(error instanceof HttpErrorResponse) {
            if(debug) {
              console.warn('Unhandled error occured while processing requests. Don\'t forget to add error handlers for your async http calls.')
            }
          } else {
            throw error;
          }
        }
        
        // NOTE it requires to have one more run.
        fixture.detectChanges();
        tick();

        passRequestsResult.asserts?.forEach((assert) => assert());

        // Collect newly scheduled HTTP requests that arrived after the previous batch.
        requestsPassageMediator.collectHttpCalls(requiredHttpCallInstructions);
        passRequestsResult = requestsPassageMediator.passRequests();
      }

      tick(_stabilizationTimeAdvance);

      requests = getRequestsFromQueue(httpTestingController);
    }

    throwIfThereIsHttpInstructionNotInvoked(callTrackers);
  } finally {
    rollbackOriginalSetInterval();
  }
}
