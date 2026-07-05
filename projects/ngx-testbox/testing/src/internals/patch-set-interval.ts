const setIntervalDetectedWarning = `Debug: setInterval detected during fixture stabilization.
  This may prevent your component from stabilizing and cause timeout or "Maximum stabilization attempts reached" errors.
  If the interval causes this kind of issue, to fix it you can:
  1. Mock the code that uses setInterval in your tests
  2. Run the setInterval code outside Angular zone using NgZone.runOutsideAngular()
  Stack trace to help locate the setInterval call:`


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
export function patchSetInterval() {
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