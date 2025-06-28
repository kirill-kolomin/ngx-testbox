import {AfterViewInit, Directive, ElementRef, Input, Renderer2} from '@angular/core';
import {testAttribute} from '../consts/test-attribute';

/**
 * A unified way of marking your elements on screen with a unique identifier for testing purposes.
 * Attribute directive to define the attribute for testing purposes.
 * It sets the data-test-id attribute on a dom node, then which is accessible with any test frameworks: Cypress, Jasmine, Jest, etc.
 * */
@Directive({
  selector: '[testboxTestId]',
  standalone: true
})
export class TestIdDirective implements AfterViewInit {
  static testAttribute = testAttribute;

  @Input({required: true}) testboxTestId = '';

  constructor(private el: ElementRef, private renderer: Renderer2) {
  }

  ngAfterViewInit() {
    this.renderer.setAttribute(this.el.nativeElement, TestIdDirective.testAttribute, this.testboxTestId);
  }

  static idsToMap<T extends string>(testIds: readonly T[]): Record<T, T> {
    return testIds.reduce((ids, testId) => {
      ids[testId] = testId;
      return ids
    }, {} as Record<T, T>)
  }
}
