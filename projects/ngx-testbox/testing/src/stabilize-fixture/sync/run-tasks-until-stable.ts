import {ComponentFixture, flush, TestBed, tick} from '@angular/core/testing';
import {collectHttpCalls} from './collectHttpCalls';
import {HttpErrorResponse} from '@angular/common/http';
import {MaximumAttemptsToStabilizeFixtureReachedError} from '../../errors/MaximumAttemptsToStabilizeFixtureReachedError';
import {HttpTestingController} from '@angular/common/http/testing';
import { CommonStabilizationParams } from '../../interfaces/common-stabilization-params';
import { trackRequiredHttpInstructionsToInvoke } from '../../internals/track-required-http-instructions-to-invoke';
import { throwIfThereIsHttpInstructionNotInvoked } from '../../internals/throw-if-there-is-http-instrcution-not-invoked';
import { patchSetInterval } from '../../internals/patch-set-interval';
import { getRequestsFromQueue } from '../../get-requests-from-queue';
import { RequestsPassageMediator } from '../../internals/requests-passage';
import { HttpCallInstruction } from '../../interfaces/http-call';
import { EnrichedHttpInstruction } from '../../internals/enriched-http-instruction';

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
   * The amount of time in milliseconds to advance the virtual clock after fixture was stabilized.
   * Is needed to settle all internal Angular's tasks.
   * This time advance runs eventually after all http requests/instructions were processed,
   * meaning the function "runTasksUntilStable" will finish its execution additionaly in the time provided within the parameter.
   * 
   * By default is equal to 1000
   */
  eventualTimeAdvance?: number;

  /**
   * Maximum number of attempts to stabilize the fixture before throwing an error.
   * This prevents infinite loops when a fixture cannot be stabilized.
  */
  maxAttempts?: number;
}

/**
 * Maximum number of attempts to stabilize the fixture before throwing an error.
 * This prevents infinite loops when a fixture cannot be stabilized.
 */
export const MAXIMUM_ATTEMPTS = 30;

/**
 * Runs Angular change detection and processes tasks until the component fixture is stable.
 * This function is designed as the core functionality of the ngx-testbox library.
 * It handles asynchronous operations in Angular components.
 *
 * It does the following operations:
 * 1. Runs change detection.
 * 2. Responds to HTTP requests.
 * 3. Pushes time forward. Executes until all asynchronous operations are resolved so that the fixture becomes stable.
 * 4. Runs the cycle again.
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
 * @throws Error if the fixture cannot be stabilized after MAXIMUM_ATTEMPTS
 * @throws Error if any HTTP instruction is not invoked during stabilization
 * @throws Error if any HTTP request is not handled during stabilization
 *
 * @remarks
 *
 * - This function is designed to work only within fakeAsync zone within the "zoneful" Angular app. Not for zoneless apps.
 * - When you created a component using the method createComponent of fixture, the fixture is marked as stable, if you don't run any asynchronous tasks within the component constructor or within its dependencies.
 * Make sure you set everything up (did overrides to methods, passed values to inputs, etc.), as you need to call this function to run the Angular component's life cycle.
 * Once you called it, the ngOnInit method will be invoked, and the fixture now is in status unstable.
 * - This function processes only http requests, which were made using Angular http client.
 * - To guarantee that your passed http call instructions will be invoked, the function will throw if some of them were not invoked during stabilization.
 * E.g., this is useful for cases when you initialize your component with some data as the initial state, and your test case covers error responses, which preserve the initial state still.
 * Though visually nothing happened for users, but as for you as a developer, you wanted to make sure that your component is not broken after the error response.
 * - And vice versa, if you didn't process any of the HTTP requests that entered the queue of tasks, the function will throw an error.
 * So it helps you to cover that piece of code which you expect to cover.
 * For cases with side effects as HTTP calls, I recommend overriding such methods with stubs.
 * - When in your code you have used setInterval calls, potentially this may be a problem for stabilizing the fixture.
 * In this case you might need to mock the place where setInterval is invoked or run the piece of code outside the angular zone using the NgZone.prototype.runOutsideAngular method.
 * Additionally, you will receive warnings in the console log if setInterval is detected with stack trace pointing you to easier find the place where setInterval is invoked.
 * 
 * Note: Potentially will be deprecated if Angular team decides to deprecate fakeAsync and zone.js in their future releases.
 * Use {@link RunTasksUntilStableParams#componentLongRunTimeout componentLongRunTimeout} for the new async/await approach instead.
 */
export const runTasksUntilStable = (fixture: ComponentFixture<unknown>, {
  eventualTimeAdvance,
  httpCallInstructions = [],
  debug
}: RunTasksUntilStableParams = {}) => {
  let rollbackOriginalSetInterval = () => {};
  const _eventualTimeAdvance = eventualTimeAdvance ?? 1000;

  if(debug) {
    rollbackOriginalSetInterval = patchSetInterval();
  }

  const httpTestingController = TestBed.inject(HttpTestingController);

  let attempt = 0;
  const {callTrackers, requiredHttpCallInstructions} = trackRequiredHttpInstructionsToInvoke(httpCallInstructions);
  let requests = getRequestsFromQueue(httpTestingController);
  const requestsPassageMediator = new RequestsPassageMediator(debug);

  // Triggers the ngOnInit to mark the fixture as unstable right after the component is created.
  fixture.detectChanges();

  // By an unknown reason angular Zone is still stable despite having requests in the queue. So I need to look to make the check if there is requests in the queue.
  while (!fixture.isStable() || requests.length > 0) {
    if (attempt++ > MAXIMUM_ATTEMPTS) {
      throw new MaximumAttemptsToStabilizeFixtureReachedError(MAXIMUM_ATTEMPTS)
    }

    collectHttpCalls(requiredHttpCallInstructions as EnrichedHttpInstruction[], requestsPassageMediator, {testRequests: requests});
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

      collectHttpCalls(requiredHttpCallInstructions as EnrichedHttpInstruction[], requestsPassageMediator, {testRequests: requests});
      passRequestsResult = requestsPassageMediator.passRequests();
    }

    // NOTE: Seems to be an internal Angular's timeout. For the tour-of-heroes is required to be gte 10.
    tick(_eventualTimeAdvance);

    requests = getRequestsFromQueue(httpTestingController);
  }

  throwIfThereIsHttpInstructionNotInvoked(callTrackers);
  rollbackOriginalSetInterval();
}
