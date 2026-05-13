import { HttpCallInstruction } from "../complete-http-calls";

/**
 * Internal type used to track which HTTP call instructions have been invoked.
 * Each entry is a tuple containing a function to check if the call was made and the original instruction.
 */
export type CallTrackers = [() => boolean, HttpCallInstruction][];