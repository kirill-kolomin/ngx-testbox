/*
 * Public API Surface of ngx-testbox/testing
 */

// Core stabilization functions
export { runTasksUntilStable, type RunTasksUntilStableParams } from './run-tasks-until-stable';
export { runTasksUntilStableAsync, type RunTasksUntilStableAsyncParams } from './run-tasks-until-stable-async';

// DOM harness
export { DebugElementHarness } from './debug-element-harness';

// HTTP instruction helpers
export { predefinedHttpCallInstructions } from './predefined-http-call-instructions';
export { predefinedHttpCallInstructionsAsync } from './predefined-http-call-instructions-async';

// Shared stabilization params
export { type CommonStabilizationParams } from './interfaces/common-stabilization-params';

// HTTP call types (full public type surface)
export {
  type HttpMethod,
  type DelayTime,
  type TimelineTime,
  type OnCompleted,
  type EndpointPath,
  type ResponseGetter,
  type ResponseGetterAsync,
  type HttpCallChecker,
  type HttpCallInstruction,
  type HttpCallInstructionAsync,
  type HttpCallInstructionExtraParams,
} from './interfaces/http-call';

// Error classes (thrown by public API, users need instanceof checks)
export { LongRunningComponentError } from './errors/LongRunningComponentError';
export { MaximumAttemptsToStabilizeFixtureReachedError } from './errors/MaximumAttemptsToStabilizeFixtureReachedError';
export { HttpInstructionWasNotExecutedDuringFixtureStabilizationError } from './errors/HttpInstructionWasNotExecutedDuringFixtureStabilizationError';
export { NoMatchingHttpInstructionForRequestFoundError } from './errors/NoMatchingHttpInstructionForRequestFoundError';
export { HttpInstructionTimelineExceededError } from './errors/HttpInstructionTimelineExceededError';
export { ConflictingHttpInstructionParamsError } from './errors/ConflictingHttpInstructionParamsError';
export { FailedToGenerateHttpResponseError } from './errors/FailedToGenerateHttpResponseError';
export { CannotUsePromiseResponseWithinFakeAsync } from './errors/CannotUsePromiseResponseWithinFakeAsync';
export { NoElementByTestIdFoundError } from './errors/NoElementByTestIdFoundError';
