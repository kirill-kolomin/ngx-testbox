import {DebugElement} from '@angular/core';
import {By} from '@angular/platform-browser';
import {testAttribute} from './consts/test-attribute';
import {NoElementByTestIdFoundError} from './errors/NoElementByTestIdFoundError';

/**
 * Interface defining the API for interacting with elements in tests.
 */
type ElementApi = {
  /**
   * Queries for an element with the test ID.
   * @param parentDebugElement - Optional parent debug element to search within.
   * @returns The found debug element.
   */
  query: (parentDebugElement?: DebugElement) => DebugElement;

  /**
   * Queries for all elements with the test ID.
   * @param parentDebugElement - Optional parent debug element to search within.
   * @returns An array of found debug elements.
   */
  queryAll: (parentDebugElement?: DebugElement) => (DebugElement)[];

  /**
   * Clicks the element.
   * @param parentDebugElement - Optional parent debug element to search within.
   */
  click: (parentDebugElement?: DebugElement) => void;

  /**
   * Focuses the element.
   * @param parentDebugElement - Optional parent debug element to search within.
   */
  focus: (parentDebugElement?: DebugElement) => void;

  /**
   * Gets the text content of the element.
   * @param parentDebugElement - Optional parent debug element to search within.
   * @returns The text content of the element.
   */
  getTextContent: (parentDebugElement?: DebugElement) => string;
}

/**
 * A utility class that provides a convenient API for interacting with elements in tests using test IDs.
 *
 * This class simplifies the process of querying for elements and performing common actions like clicking,
 * focusing, and getting text content. It works with elements that have a test ID attribute.
 *
 * @example
 * ```typescript
 * const TEST_IDS = ['submitButton', 'cancelButton'] as const;
 * const harness = new DebugElementHarness(fixture.debugElement, TEST_IDS);
 *
 * // Query elements
 * const submitButton = harness.elements.submitButton.query();
 *
 * // Interact with elements
 * harness.elements.submitButton.click();
 * harness.elements.cancelButton.focus();
 *
 * // Get text content
 * const buttonText = harness.elements.submitButton.getTextContent();
 * ```
 *
 * @typeParam TestIds - A readonly array of string literals representing the test IDs to be used.
 */
export class DebugElementHarness<TestIds extends readonly string[]> {
  /**
   * A record of element APIs for each test ID.
   *
   * This property provides access to the API methods for each element identified by a test ID.
   * The keys of this record are the test IDs provided in the constructor.
   */
  elements: Record<TestIds[number], ElementApi>

  /**
   * Creates a new instance of DebugElementHarness.
   *
   * @param debugElement - The root debug element to search within.
   * @param testIds - An array of test IDs to create element APIs for.
   * @param testIdAttribute - The attribute name used for test IDs (default: 'data-test-id').
   */
  constructor(private debugElement: DebugElement, testIds: TestIds, private testIdAttribute = testAttribute) {
    this.elements = testIds.reduce((elements, testId) => {
      elements[testId as TestIds[number]] = {
        query: (parentDebugElement?: DebugElement) => this.#query(testId, parentDebugElement),
        queryAll: (parentDebugElement?: DebugElement) => this.#queryAll(testId, parentDebugElement),
        click: (parentDebugElement?: DebugElement) => this.#clickOnElement(testId, parentDebugElement),
        focus: (parentDebugElement?: DebugElement) => this.#focusOnElement(testId, parentDebugElement),
        getTextContent: (parentDebugElement?: DebugElement) => this.#getTextContent(testId, parentDebugElement),
      } satisfies ElementApi;

      return elements
    }, {} as Record<TestIds[number], ElementApi>)
  }

  #query(testId: TestIds[number], parentDebugElement?: DebugElement): DebugElement {
    return (parentDebugElement || this.debugElement).query(By.css(`[${this.testIdAttribute}="${testId}"]`));
  }

  #queryAll(testId: TestIds[number], parentDebugElement?: DebugElement): DebugElement[] {
    return (parentDebugElement || this.debugElement).queryAll(By.css(`[${this.testIdAttribute}="${testId}"]`));
  }

  #clickOnElement(testId: TestIds[number], parentDebugElement?: DebugElement): void {
    const element = this.#query(testId, parentDebugElement);

    if (!element) {
      throw new NoElementByTestIdFoundError(testId);
    }

    element.nativeElement.click();
  }

  #focusOnElement(testId: TestIds[number], parentDebugElement?: DebugElement): void {
    const element = this.#query(testId, parentDebugElement);

    if (!element) {
      throw new NoElementByTestIdFoundError(testId);
    }

    element.nativeElement.focus();
  }

  #getTextContent(testId: TestIds[number], parentDebugElement?: DebugElement): string {
    const element = this.#query(testId, parentDebugElement);

    if (!element) {
      throw new NoElementByTestIdFoundError(testId);
    }

    return element.nativeElement.textContent;
  }
}
