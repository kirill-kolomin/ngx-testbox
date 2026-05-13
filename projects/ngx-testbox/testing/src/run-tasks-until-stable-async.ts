import { ComponentFixture, TestBed } from "@angular/core/testing";
import { CommonStabilizationParams } from "./interfaces/common-stabilization-params";
import { HttpTestingController, TestRequest } from "@angular/common/http/testing";
import { trackRequiredHttpInstructionsToInvoke } from "./internals/track-required-http-instructions-to-invoke";
import { completeHttpCalls, getRequestsFromQueue } from "./complete-http-calls";
import { LongRunningComponentError } from "./errors/LongRunningComponentError";
import { throwIfThereIsHttpInstructionNotInvoked } from "./internals/throw-if-there-is-http-instrcution-not-invoked";
import { patchSetInterval } from "./internals/patch-set-interval";

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
 * The time when component is considered as too-long-running in order to finish the test.
 */
export const COMPONENT_LONG_RUN_TIMEOUT = 10_000;

/**
 * Runs Angular change detection and processes tasks until the component fixture is stable.
 *
 * Might be running within zoneless Angular applications.
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

  let requests: TestRequest[] = [];

  let longRunTimeoutTimer: number | null = null;

  await Promise.race([
    new Promise((_, reject) => {
      longRunTimeoutTimer = setTimeout(() => reject(new LongRunningComponentError(_componentLongRunTimeout)), _componentLongRunTimeout);
    }),
    (new Promise((resolve, reject) => runTasks(resolve, reject)))
  ]);

  if(longRunTimeoutTimer) {
    clearTimeout(longRunTimeoutTimer);
  }

  // Ensure all expected HTTP instructions were invoked.
  throwIfThereIsHttpInstructionNotInvoked(callTrackers);
  rollbackOriginalSetInterval();

  async function runTasks(resolve: (value: any) => void, reject: (error: any) => void, _requests: TestRequest[] = []) {
    requests = [..._requests, ...getRequestsFromQueue(httpTestingController)];

    if(requests.length === 0) {
      // Nothing left in the HTTP queue; we're stabilized.
      resolve(undefined);
      return;
    }

    try {
      await completeHttpCalls(requiredHttpCallInstructions, {testRequests: requests});
      requests = [];
    } catch (error) {
      reject(error);
    }

    if (advanceTimers) {
      await advanceTimers();
    }

    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();

    requests = getRequestsFromQueue(httpTestingController);

    if(requests.length === 0) {
      // Nothing left in the HTTP queue; we're stabilized.
      resolve(undefined);
    } else {
      setTimeout(() => runTasks(resolve, reject, requests), 16);
    }
  }
}
