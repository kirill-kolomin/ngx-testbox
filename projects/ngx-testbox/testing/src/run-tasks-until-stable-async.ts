import { ComponentFixture, TestBed } from "@angular/core/testing";
import { CommonStabilizationParams } from "./interfaces/common-stabilization-params";
import { HttpTestingController, TestRequest } from "@angular/common/http/testing";
import { trackRequiredHttpInstructionsToInvoke } from "./internals/track-required-http-instructions-to-invoke";
import { LongRunningComponentError } from "./errors/LongRunningComponentError";
import { throwIfThereIsHttpInstructionNotInvoked } from "./internals/throw-if-there-is-http-instrcution-not-invoked";
import { patchSetInterval } from "./internals/patch-set-interval";
import { getRequestsFromQueue } from "./internals/get-requests-from-queue";
import { HttpCallInstructionAsync } from "./interfaces/http-call";
import { EnrichedHttpInstructionAsync } from "./internals/enriched-http-instruction";
import { RequestsPassageMediatorAsync } from "./internals/requests-passage-async";

import { validateHttpInstructions } from "./internals/validate-http-instructions";

/**
 * Configuration parameters for the runTasksUntilStableAsync function.
 *
 * @interface RunTasksUntilStableAsyncParams
 */
export interface RunTasksUntilStableAsyncParams extends CommonStabilizationParams {
  /**
   * Optional callback to advance fake timers (Jasmine, Vitest, etc.)
   * during stabilization.
   */
  advanceTimers?: (delayMs: number) => void | Promise<void>;
  
  /**
   * The time when component is considered as too-long-running to finish the test. Measured in milliseconds.
   *
   * Defaults to **10000**.
   */
  componentLongRunTimeout?: number;
  httpCallInstructions?: HttpCallInstructionAsync[];
}

/**
 * The default timeout in milliseconds after which runTasksUntilStableAsync considers the component too long running.
 * @deprecated This constant is not part of the public API. Use the componentLongRunTimeout parameter instead.
 */
export const COMPONENT_LONG_RUN_TIMEOUT = 10_000;

/**
 * Runs Angular change detection and processes tasks until the component fixture is stable.
 *
 * This is the async/await variant designed for both zoneless and zoneful Angular applications.
 * It waits for real asynchronous operations to complete rather than simulating time with tick().
 *
 * It does the following operations:
 * 1. Runs change detection.
 * 2. Responds to HTTP requests.
 * 3. Waits for the fixture to become stable using real time or provided timer advancement.
 * 4. Runs the cycle again until both the fixture is stable and no HTTP requests remain.
 *
 * @param fixture - The component fixture to stabilize
 * @param params - Optional configuration parameters
 * @throws LongRunningComponentError if the component does not stabilize within componentLongRunTimeout (default: 10000ms)
 * @throws Error if any HTTP instruction is not invoked during stabilization
 * @throws Error if any HTTP request is not handled during stabilization
 *
 * @example
 * ```typescript
 * it('should load data', async () => {
 *   const fixture = TestBed.createComponent(MyComponent);
 *
 *   await runTasksUntilStableAsync(fixture, {
 *     httpCallInstructions: [
 *       [['api/users', 'GET'], () => new HttpResponse({ body: users, status: 200 })]
 *     ]
 *   });
 *
 *   // Now you can make assertions
 *   expect(fixture.componentInstance.users).toEqual(users);
 * });
 * ```
 */
export async function runTasksUntilStableAsync(
  fixture: ComponentFixture<unknown>,
  {
    httpCallInstructions = [],
    advanceTimers,
    componentLongRunTimeout,
    debug
  }: RunTasksUntilStableAsyncParams = {}
): Promise<void> {
  const _httpCallInstructions = httpCallInstructions.slice();
  validateHttpInstructions(_httpCallInstructions);

  let rollbackOriginalSetInterval = () => {};

  if(debug) {
    rollbackOriginalSetInterval = patchSetInterval();
  }

  const _componentLongRunTimeout = componentLongRunTimeout ?? COMPONENT_LONG_RUN_TIMEOUT;
  const httpTestingController = TestBed.inject(HttpTestingController);
  const {callTrackers, requiredHttpCallInstructions} = trackRequiredHttpInstructionsToInvoke<EnrichedHttpInstructionAsync>(_httpCallInstructions);

  const requestsPassageMediator = new RequestsPassageMediatorAsync();

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

    if(requests.length === 0 && fixture.isStable()) {
      // Nothing left in the HTTP queue; we're stabilized.
      resolve(undefined);
      return;
    }

    try {
      requestsPassageMediator.collectHttpCalls(requiredHttpCallInstructions, {
        testRequests: requests
      });

      let passRequestsResult = await requestsPassageMediator.passRequests(advanceTimers);
      while (passRequestsResult.shouldStabilizeAfterRequests) {
        // Let Angular run change detection and settle microtasks.
        fixture.detectChanges();
        passRequestsResult.asserts?.forEach((assert) => assert());

        await fixture.whenStable();
        fixture.detectChanges();
        await fixture.whenStable();

        // Collect newly scheduled HTTP requests that arrived after the previous batch.
        requestsPassageMediator.collectHttpCalls(requiredHttpCallInstructions);
        passRequestsResult = await requestsPassageMediator.passRequests(advanceTimers);
      }
    } catch (error) {
      reject(error);
    }

    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();

    requests = getRequestsFromQueue(httpTestingController);

    if(requests.length === 0 && fixture.isStable()) {
      // Nothing left in the HTTP queue; we're stabilized.
      resolve(undefined);
    } else {
      setTimeout(() => runTasks(resolve, reject, requests));
    }
  }
}
