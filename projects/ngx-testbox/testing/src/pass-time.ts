import {flushMicrotasks, tick} from '@angular/core/testing';

/**
 * Default time in milliseconds to advance the virtual clock in tests.
 */
export const TIME_MS = 1000;

/**
 * Advances the virtual clock by the specified amount of time and processes all microtasks.
 *
 * This utility function is useful in Angular tests to simulate the passage of time
 * for testing asynchronous operations like timeouts, intervals, and promises.
 *
 * @example
 * ```typescript
 * // In a fakeAsync test
 * component.startTimer();
 * passTime(); // Advances time by default 1000ms
 * expect(component.timerCompleted).toBeTrue();
 *
 * // With custom time
 * component.startLongProcess();
 * passTime(5000); // Advances time by 5000ms
 * expect(component.processCompleted).toBeTrue();
 * ```
 *
 * @param time - The amount of time in milliseconds to advance (defaults to TIME_MS)
 */
export const passTime = (time = TIME_MS): void => {
  tick(time);
  flushMicrotasks();
}
