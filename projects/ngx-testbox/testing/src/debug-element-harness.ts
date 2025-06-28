import {DebugElement} from '@angular/core';
import {By} from '@angular/platform-browser';
import {testAttribute} from './consts/test-attribute';

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
   */
  click: () => void;

  /**
   * Focuses the element.
   */
  focus: () => void;

  /**
   * Gets the text content of the element.
   * @returns The text content of the element.
   */
  getTextContent: () => string;
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
  constructor(private debugElement: DebugElement, testIds: TestIds, testIdAttribute = testAttribute) {
    this.elements = testIds.reduce((elements, testId) => {
      elements[testId as TestIds[number]] = {
        query: (parentDebugElement?: DebugElement) => (parentDebugElement || this.debugElement).query(By.css(`[${testIdAttribute}="${testId}"]`)),
        queryAll: (parentDebugElement?: DebugElement) => (parentDebugElement || this.debugElement).queryAll(By.css(`[${testIdAttribute}="${testId}"]`)),
        click() {
          // TODO throw human readable error, if an element is not found
          this.query()!.nativeElement.click();
        },
        focus() {
          // TODO throw human readable error, if an element is not found
          this.query()!.nativeElement.focus();
        },
        getTextContent(): string {
          return this.query()?.nativeElement.textContent;
        }
      } satisfies ElementApi;

      return elements
    }, {} as Record<TestIds[number], ElementApi>)
  }
}
