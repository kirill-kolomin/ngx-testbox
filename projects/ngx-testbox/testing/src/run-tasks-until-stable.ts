import {ComponentFixture} from '@angular/core/testing';
import {passTime} from './pass-time';
import {completeHttpCalls, HttpCallInstruction, ResponseGetter} from './complete-http-calls';
import {HttpErrorResponse} from '@angular/common/http';

/**
 * Configuration parameters for the runTasksUntilStable function.
 *
 * @interface RunTasksUntilStableParams
 */
export interface RunTasksUntilStableParams {
  /**
   * The amount of time in milliseconds to advance the virtual clock in each iteration.
   * This is passed to the passTime function.
   */
  iterationMs?: number;

  /**
   * Array of HTTP call instructions to process during stabilization.
   * These instructions define how to handle specific HTTP requests.
   */
  httpCallInstructions?: HttpCallInstruction[];
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
 * Runs Angular change detection and processes tasks until the component fixture is stable.
 * This function is designed to help with testing asynchronous operations in Angular components.
 *
 * The function repeatedly runs change detection and advances the virtual clock until the fixture
 * is stable. It also handles HTTP requests if instructions are provided. If the fixture cannot
 * be stabilized after a maximum number of attempts, an error is thrown.
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
 * - This function is designed to work only within fakeAsync zone.
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
 */
export const runTasksUntilStable = (fixture: ComponentFixture<unknown>, {
  iterationMs,
  httpCallInstructions
}: RunTasksUntilStableParams = {}) => {
  const rollbackOriginalSetInterval = patchSetInterval();

  let attempt = 0;
  const {callTrackers, requiredHttpCallInstructions} = trackRequiredHttpInstructionsToInvoke(httpCallInstructions);

  // Triggers the ngOnInit to mark the fixture as unstable right after the component is created.
  fixture.detectChanges();

  while (!fixture.isStable()) {
    if (attempt++ > MAXIMUM_ATTEMPTS) {
      throw new Error(
        `Maximum stabilization attempts (${MAXIMUM_ATTEMPTS}) reached. The fixture could not be stabilized. ` +
        'This may be caused by continuous asynchronous operations like setInterval, or other ongoing processes. ' +
        'Check for setInterval calls in your component and consider mocking them or running them outside Angular zone.');
    }

    fixture.detectChanges();
    passTime(iterationMs);

    if (requiredHttpCallInstructions) {
      completeHttpCalls(requiredHttpCallInstructions);
      fixture.detectChanges();
      try {
        passTime(iterationMs);
      } catch (error) {
        // We need the catch in cases when http instruction responds with an error, and the error callback is not passed to the observer. Otherwise, the error will fail the runtime.
        if (!(error instanceof HttpErrorResponse)) {
          throw error;
        }
      }
    }
  }

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
      throw new Error(
        `An HTTP call instruction was not executed during test stabilization at index ${index}. ` +
        'This may indicate that the expected HTTP request was never made by your component, ' +
        'or that the request was made with different parameters than expected. ' +
        'Check that your component is correctly triggering this HTTP request and that ' +
        'the URL and method in your test instructions match what your component is requesting. ' +
        `The http instruction is -> ${callTracker[1]}`
      );
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

    console.warn(
      'Warning: setInterval detected during runTasksUntilStable execution. ' +
      'This may prevent your component from stabilizing and cause "Maximum stabilization attempts reached" errors. ' +
      'If the interval causes this kind of issue, to fix it you can:\n' +
      '1. Mock the code that uses setInterval in your tests\n' +
      '2. Run the setInterval code outside Angular zone using NgZone.runOutsideAngular()\n' +
      'Stack trace to help locate the setInterval call:',
      trace
    );

    return originalSetInterval(handler, timeout, ...args);
  }

  return function rollbackOriginalSetInterval() {
    window.setInterval = originalSetInterval
  }
}
