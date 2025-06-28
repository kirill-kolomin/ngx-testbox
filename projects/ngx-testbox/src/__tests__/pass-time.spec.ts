import { fakeAsync } from '@angular/core/testing';
import { passTime, TIME_MS } from '../../testing/src/pass-time';

describe('passTime', () => {
    it('should advance time by default amount when no parameter is provided', fakeAsync(() => {
      let timeoutExecuted = false;

      setTimeout(() => {
        timeoutExecuted = true;
      }, TIME_MS - 1);

      passTime();

      expect(timeoutExecuted).toBe(true);
    }));

    it('should not execute timeouts that exceed the specified time', fakeAsync(() => {
      let timeoutExecuted = false;

      setTimeout(() => {
        timeoutExecuted = true;
      }, TIME_MS + 100);

      passTime();

      expect(timeoutExecuted).toBe(false);
    }));

    it('should advance time by custom amount when parameter is provided', fakeAsync(() => {
      let timeoutExecuted = false;
      const customTime = 2000;

      setTimeout(() => {
        timeoutExecuted = true;
      }, customTime - 1);

      passTime(customTime);

      expect(timeoutExecuted).toBe(true);
    }));

    it('should process microtasks', fakeAsync(() => {
      let promiseResolved = false;

      Promise.resolve().then(() => {
        promiseResolved = true;
      });

      passTime(0); // Even with 0 time, microtasks should be processed

      expect(promiseResolved).toBe(true);
    }));

    it('should process chained promises', fakeAsync(() => {
      let counter = 0;

      Promise.resolve()
        .then(() => { counter++; })
        .then(() => { counter++; })
        .then(() => { counter++; });

      passTime(0);

      expect(counter).toBe(3);
    }));

    it('should process both timeouts and microtasks', fakeAsync(() => {
      let timeoutExecuted = false;
      let promiseResolved = false;

      setTimeout(() => {
        timeoutExecuted = true;
      }, 500);

      Promise.resolve().then(() => {
        promiseResolved = true;
      });

      passTime();

      expect(timeoutExecuted).toBe(true);
      expect(promiseResolved).toBe(true);
    }));
});
