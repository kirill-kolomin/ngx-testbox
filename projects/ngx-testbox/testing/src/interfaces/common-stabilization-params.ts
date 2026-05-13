import { HttpCallInstruction } from "../complete-http-calls";

export interface CommonStabilizationParams {
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