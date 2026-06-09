/**
 * Thrown by `DebugElementHarness` when `click()`, `focus()`, `getTextContent()`,
 * `changeValue()`, or `inputValue()` is called on a missing element.
 *
 * Ensure the matching element exists in the current DOM state.
 */
export class NoElementByTestIdFoundError extends Error {
  constructor(testId: string) {
    super(`Element with test ID "${testId}" not found`);
  }
}
