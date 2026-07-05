/**
 * Thrown by `runTasksUntilStable` (fakeAsync) when a response getter returns a Promise.
 *
 * Use `runTasksUntilStableAsync` instead, or make the getter synchronous.
 */
export class CannotUsePromiseResponseWithinFakeAsync extends Error {
  constructor() {
    super(`Can't use promise-like response within fake async approach. Please, use new async/await approach.`);
  }
}