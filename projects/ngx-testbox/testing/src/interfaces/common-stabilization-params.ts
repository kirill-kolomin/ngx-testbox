export interface CommonStabilizationParams {
  /**
   * When turned on (true) indicates places that invoke setInterval.
   * Active setInterval is the reason why the fixture does not stabilize. 
   * False by default.
   */
  debug?: boolean;
}