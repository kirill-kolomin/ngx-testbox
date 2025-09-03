export class NoElementByTestIdFoundError extends Error {
  constructor(testId: string) {
    super(`Element with test ID "${testId}" not found`);
  }
}
