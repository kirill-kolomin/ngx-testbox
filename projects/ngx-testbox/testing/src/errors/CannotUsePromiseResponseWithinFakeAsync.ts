export class CannotUsePromiseResponseWithinFakeAsync extends Error {
  constructor() {
    super(`Can't use promise-like response within fake async approach. Please, use new async/await approach.`);
  }
}