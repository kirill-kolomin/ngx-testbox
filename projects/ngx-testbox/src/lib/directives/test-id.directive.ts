import {AfterViewInit, Directive, ElementRef, Input, Renderer2} from '@angular/core';
import {testAttribute} from '../consts/test-attribute';

/**
 * A unified way of marking your elements on screen with a unique identifier for testing purposes.
 *
 * This attribute directive defines a consistent approach for adding test identifiers to DOM elements.
 * It sets the 'data-test-id' attribute on a DOM node, which can then be accessed by any testing
 * framework such as Cypress, Jasmine, Jest, etc.
 *
 * @example
 * ```html
 * <button testboxTestId="submit-button">Submit</button>
 * <!-- Renders as: <button data-test-id="submit-button">Submit</button> -->
 * ```
 *
 * @usageNotes
 * The directive requires a value to be provided for the testboxTestId input.
 * This value will be used as the identifier for the element in tests.
 */
@Directive({
  selector: '[testboxTestId]',
  standalone: true
})
export class TestIdDirective implements AfterViewInit {
  /**
   * The HTML attribute name that will be added to the DOM elements.
   * This is set to 'data-test-id' by default.
   *
   * @static
   * @type {string}
   */
  static testAttribute: string = testAttribute;

  /**
   * The value to be assigned to the data-test-id attribute.
   * This is a required input that must be provided when using the directive.
   *
   * @required
   * @example
   * ```html
   * <div testboxTestId="user-profile">User Profile</div>
   * ```
   */
  @Input({required: true}) testboxTestId = '';

  constructor(private el: ElementRef, private renderer: Renderer2) {
  }

  ngAfterViewInit() {
    this.renderer.setAttribute(this.el.nativeElement, TestIdDirective.testAttribute, this.testboxTestId);
  }

  /**
   * Utility method that converts an array of test IDs into a map where both keys and values are the test IDs.
   * This is useful for creating a type-safe object of test IDs that can be used in components and tests.
   *
   * @static
   * @template T - Type parameter extending string for the test IDs
   * @param {readonly T[]} testIds - Array of test ID strings
   * @returns {Record<T, T>} An object where keys and values are the test IDs
   *
   * @example
   * ```typescript
   * const testIds = TestIdDirective.idsToMap(['submit-button', 'cancel-button', 'user-name']);
   * // Results in: { 'submit-button': 'submit-button', 'cancel-button': 'cancel-button', 'user-name': 'user-name' }
   *
   * // Can be used in a component:
   * @Component({
   *   template: `<button [testboxTestId]="testIds.submit-button">Submit</button>`
   * })
   * class MyComponent {
   *   testIds = testIds;
   * }
   * ```
   */
  static idsToMap<T extends string>(testIds: readonly T[]): Record<T, T> {
    return testIds.reduce((ids, testId) => {
      ids[testId] = testId;
      return ids
    }, {} as Record<T, T>)
  }
}
