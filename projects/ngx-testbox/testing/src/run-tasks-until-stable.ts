import {ComponentFixture, TestBed} from '@angular/core/testing';
import {passTime} from './pass-time';
import {completeHttpCalls, getRequestsFromQueue, HttpCallInstruction, ResponseGetter} from './complete-http-calls';
import {HttpErrorResponse} from '@angular/common/http';
import {MaximumAttemptsToStabilizeFixtureReachedError} from './errors/MaximumAttemptsToStabilizeFixtureReachedError';
import {
  HttpInstructionWasNotExecutedDuringFixtureStabilizationError
} from './errors/HttpInstructionWasNotExecutedDuringFixtureStabilizationError';
import {HttpTestingController} from '@angular/common/http/testing';
import { LongRunningComponentError } from './errors/LongRunningComponentError';

const setIntervalDetectedWarning = `Debug: setInterval detected during fixture stabilization.
  This may prevent your component from stabilizing and cause timeout or "Maximum stabilization attempts reached" errors.
  If the interval causes this kind of issue, to fix it you can:
  1. Mock the code that uses setInterval in your tests
  2. Run the setInterval code outside Angular zone using NgZone.runOutsideAngular()
  Stack trace to help locate the setInterval call:`

interface CommonStabilizationParams {
  /**
   * Array of HTTP call instructions to process during stabilization.
   * These instructions define how to handle specific HTTP requests.
   */
  httpCallInstructions?: HttpCallInstruction[];

  /**
   * When turned on (true) indicates places that invoke setInterval.
   * Active setInterval is the reason why the fixture does not stabilize. 
   * False by default.
   */
  debug?: boolean;
}

/**
 * Configuration parameters for the runTasksUntilStable function.
 *
 * @interface RunTasksUntilStableParams
 */
export interface RunTasksUntilStableAsyncParams extends CommonStabilizationParams {
  /**
   * Optional callback to advance fake timers (Jasmine, Vitest, etc.)
   * during stabilization.
   */
  advanceTimers?: () => void | Promise<void>;
  
  /**
   * The time when component is considered as too-long-running to finish the test. Measured in milliseconds.
   */
  componentLongRunTimeout?: number;
}

/**
 * Configuration parameters for the runTasksUntilStable function.
 *
 * @interface RunTasksUntilStableParams
 */
export interface RunTasksUntilStableParams extends CommonStabilizationParams {
  /**
   * The amount of time in milliseconds to advance the virtual clock in each iteration.
   * This is passed to the passTime function.
   */
  iterationMs?: number;
}

/**
 * Internal type used to track which HTTP call instructions have been invoked.
 * Each entry is a tuple containing a function to check if the call was made and the original instruction.
 */
type CallTrackers = [() => boolean, HttpCallInstruction][];

/**
 * Maximum number of attempts to stabilize the fixture before throwing an error.
 * This prevents infinite loops when a fixture cannot be stabilized.
 */
export const MAXIMUM_ATTEMPTS = 30;

/**
 * The time when component is considered as too-long-running in order to finish the test.
 */
export const COMPONENT_LONG_RUN_TIMEOUT = 10_000;

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
  iterationMs,
  httpCallInstructions = [],
  debug
}: RunTasksUntilStableParams = {}) => {
  let rollbackOriginalSetInterval = () => {};

  if(debug) {
    rollbackOriginalSetInterval = patchSetInterval();
  }

  const httpTestingController = TestBed.inject(HttpTestingController)

  let attempt = 0;
  const {callTrackers, requiredHttpCallInstructions} = trackRequiredHttpInstructionsToInvoke(httpCallInstructions);
  let requests = getRequestsFromQueue(httpTestingController);

  // Triggers the ngOnInit to mark the fixture as unstable right after the component is created.
  fixture.detectChanges();

  // By an unknown reason angular Zone is still stable despite having requests in the queue. So I need to look to make the check if there is requests in the queue.
  while (!fixture.isStable() || requests.length > 0) {
    if (attempt++ > MAXIMUM_ATTEMPTS) {
      throw new MaximumAttemptsToStabilizeFixtureReachedError(MAXIMUM_ATTEMPTS)
    }

    fixture.detectChanges();
    passTime(iterationMs);
    completeHttpCalls(requiredHttpCallInstructions, {testRequests: requests});
    fixture.detectChanges();
    try {
      passTime(iterationMs);
    } catch (error) {
      // We need the catch in cases when http instruction responds with an error, and the error callback is not passed to the observer. Otherwise, the error will fail the runtime.
      if (!(error instanceof HttpErrorResponse)) {
        throw error;
      }
    }

    requests = getRequestsFromQueue(httpTestingController);
  }

  throwIfThereIsHttpInstructionNotInvoked(callTrackers);
  rollbackOriginalSetInterval();
}

/**
 * Runs Angular change detection and processes tasks until the component fixture is stable.
 *
 * Async variant intended for zoneless Angular applications.
 */
export async function runTasksUntilStableAsync(
  fixture: ComponentFixture<unknown>,
  {
    httpCallInstructions = [],
    advanceTimers,
    componentLongRunTimeout,
    debug
  }: RunTasksUntilStableAsyncParams = {
    componentLongRunTimeout: COMPONENT_LONG_RUN_TIMEOUT
  }
): Promise<void> {
  let rollbackOriginalSetInterval = () => {};

  if(debug) {
    rollbackOriginalSetInterval = patchSetInterval();
  }

  const _componentLongRunTimeout = componentLongRunTimeout ?? COMPONENT_LONG_RUN_TIMEOUT;
  const httpTestingController = TestBed.inject(HttpTestingController);
  const {callTrackers, requiredHttpCallInstructions} = trackRequiredHttpInstructionsToInvoke(httpCallInstructions);

  // Triggers the ngOnInit to mark the fixture as unstable right after the component is created.
  fixture.detectChanges();

  let requests = getRequestsFromQueue(httpTestingController);

  let longRunTimeoutTimer: number | null = null;

  await Promise.race([
    new Promise((_, reject) => {
      longRunTimeoutTimer = setTimeout(() => reject(new LongRunningComponentError(_componentLongRunTimeout)), _componentLongRunTimeout);
    }),
    (new Promise(async (resolve, reject) => {
      (async function runTasks() {
        if (requests.length > 0) {
          try {
            completeHttpCalls(requiredHttpCallInstructions, {testRequests: requests});
          } catch (error) {
            reject(error);
          }

          if (advanceTimers) {
            await advanceTimers();
          }

          fixture.detectChanges();
        } else {
          // Nothing left in the HTTP queue; we're stabilized.
          resolve(undefined);
          return;
        }

        requests = getRequestsFromQueue(httpTestingController);
        setTimeout(runTasks, 16);
      })();
    }))
    .then(() => fixture.whenStable())
  ]);

  if(longRunTimeoutTimer) {
    clearTimeout(longRunTimeoutTimer);
  }

  // Ensure all expected HTTP instructions were invoked.
  throwIfThereIsHttpInstructionNotInvoked(callTrackers);
  rollbackOriginalSetInterval();
}

/**
 * Creates trackers for HTTP call instructions to monitor which ones are invoked.
 *
 * This function wraps each response getter in the HTTP call instructions with a tracker
 * that records when the instruction is invoked.
 *
 * @param httpCallInstructions - Array of HTTP call instructions to track
 * @returns An object containing the modified HTTP call instructions and an array of call trackers
 * @returns.requiredHttpCallInstructions - The modified HTTP call instructions with tracking wrappers
 * @returns.callTrackers - Array of call trackers, each containing a function to check if the call was made
 * @internal
 */
function trackRequiredHttpInstructionsToInvoke(_httpCallInstructions: HttpCallInstruction[] = []): {
  requiredHttpCallInstructions: HttpCallInstruction[],
  callTrackers: CallTrackers
} {
  const callTrackers: CallTrackers = [];
  const httpCallInstructions = _httpCallInstructions.slice()

  for (let httpCallInstruction of httpCallInstructions) {
    let wasCalled = false;
    const responseGetter = httpCallInstruction[1];

    const tracker: ResponseGetter = function (...args: Parameters<ResponseGetter>) {
      wasCalled = true;
      return responseGetter(...args);
    }
    const checkWasCalled = () => wasCalled;

    callTrackers.push([checkWasCalled, [httpCallInstruction[0], responseGetter]])
    httpCallInstruction[1] = tracker;
  }

  return {requiredHttpCallInstructions: httpCallInstructions, callTrackers};
}

/**
 * Checks if all HTTP call instructions were invoked and throws an error if any were not.
 *
 * This function is called after stabilization to ensure that all expected HTTP calls
 * were actually made during the process.
 *
 * @param callTrackers - Array of call trackers to check
 * @throws Error if any HTTP call instruction was not invoked
 * @internal
 */
function throwIfThereIsHttpInstructionNotInvoked(callTrackers: CallTrackers) {
  for (let index = 0; index < callTrackers.length; index++) {
    const callTracker = callTrackers[index];

    if (!callTracker[0]()) {
      throw new HttpInstructionWasNotExecutedDuringFixtureStabilizationError(index, callTracker[1].toString());
    }
  }
}

/**
 * Temporarily patches the global setInterval function to provide warnings about potential issues.
 *
 * This function replaces the standard setInterval with a version that logs warnings when called,
 * as setInterval can cause problems with the runTasksUntilStable function by preventing
 * stabilization. It returns a function that can be called to restore the original setInterval.
 *
 * @returns A function that restores the original setInterval when called
 * @internal
 */
function patchSetInterval() {
  const originalSetInterval = window.setInterval;

  // @ts-ignore Missing property __promisify__
  window.setInterval = function setInterval(handler: TimerHandler, timeout?: number, ...args: any[]) {
    const trace = (new Error().stack as string).replace('Error', 'Trace');

    console.warn(setIntervalDetectedWarning, trace);

    return originalSetInterval(handler, timeout, ...args);
  }

  return function rollbackOriginalSetInterval() {
    window.setInterval = originalSetInterval
  }
}
