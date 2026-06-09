export interface CommonStabilizationParams {
  /**
   * When turned on (true), logs warnings when `setInterval` is detected.
   * Active `setInterval` is a common reason why the fixture does not stabilize.
   * False by default.
   */
  debug?: boolean;
}