/*
 * Public API Surface of ngx-testbox
 */

export {runTasksUntilStable, type RunTasksUntilStableParams, MAXIMUM_ATTEMPTS} from './stabilize-fixture/sync/run-tasks-until-stable';
export {runTasksUntilStableAsync, type RunTasksUntilStableAsyncParams, COMPONENT_LONG_RUN_TIMEOUT} from './stabilize-fixture/async/run-tasks-until-stable-async'
export {DebugElementHarness} from './debug-element-harness';
export {predefinedHttpCallInstructions} from './predefined-http-call-instructions';
export {type CommonStabilizationParams} from './interfaces/common-stabilization-params';
export {type EndpointPath, type ResponseGetter, type HttpCallChecker, type HttpCallInstruction} from './interfaces/http-call';
