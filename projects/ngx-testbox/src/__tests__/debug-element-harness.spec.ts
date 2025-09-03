import { Component, DebugElement } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElementHarness } from '../../testing/src/debug-element-harness';
import createSpy = jasmine.createSpy;
import {NoElementByTestIdFoundError} from '../../testing/src/errors/NoElementByTestIdFoundError';

@Component({
  template: `
      <button [attr.data-test-id]="'button'">Click me</button>
      <input [attr.data-test-id]="'input'" />
      <div [attr.data-test-id]="'text'">Some text content</div>
      <div [attr.data-test-id]="'multiple'" class="item">Item 1</div>
      <div [attr.data-test-id]="'multiple'" class="item">Item 2</div>
      <div [attr.data-test-id]="'container'">
        <button [attr.data-test-id]="'button'">Nested button</button>
        <div [attr.data-test-id]="'multiple'" class="item">Item 3</div>
        <div [attr.data-test-id]="'multiple'" class="item">Item 4</div>
      </div>
  `
})
class TestComponent {}

describe('DebugElementHarness', () => {
  let fixture: ComponentFixture<TestComponent>;
  let debugElement: DebugElement;
  let harness: DebugElementHarness<readonly ['container', 'button', 'input', 'text', 'multiple']>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TestComponent);
    debugElement = fixture.debugElement;
    fixture.detectChanges();

    harness = new DebugElementHarness(
      debugElement,
      ['container', 'button', 'input', 'text', 'multiple'] as const
    );
  });

  describe('constructor', () => {
    it('should create an instance with default test ID attribute', () => {
      expect(harness).toBeTruthy();
      expect(harness.elements).toBeDefined();
      expect(harness.elements.container).toBeDefined();
      expect(harness.elements.button).toBeDefined();
      expect(harness.elements.input).toBeDefined();
      expect(harness.elements.text).toBeDefined();
      expect(harness.elements.multiple).toBeDefined();
    });

    it('should create an instance with custom test ID attribute', () => {
      const customAttribute = 'custom-test-id';
      const customElement = fixture.debugElement.query(By.css('div'));
      customElement.attributes[customAttribute] = 'custom';

      const customHarness = new DebugElementHarness(
        debugElement,
        ['custom'] as const,
        customAttribute
      );

      expect(customHarness).toBeTruthy();
      expect(customHarness.elements.custom).toBeDefined();
    });
  });

  describe('query', () => {
    it('should find an element by test ID', () => {
      const buttonElement = harness.elements.button.query();
      expect(buttonElement).toBeTruthy();
      expect(buttonElement.nativeElement.tagName.toLowerCase()).toBe('button');
    });

    it('should find an element within a parent element', () => {
      const containerElement = harness.elements.container.query();
      const buttonElement = harness.elements.button.query(containerElement);
      expect(buttonElement).toBeTruthy();
      expect(buttonElement.nativeElement.tagName.toLowerCase()).toBe('button');
      expect(buttonElement.nativeElement.textContent.trim()).toBe('Nested button');
    });

    it('should return undefined if element is not found', () => {
      const nonExistentHarness = new DebugElementHarness(
        debugElement,
        ['nonexistent'] as const
      );
      const element = nonExistentHarness.elements.nonexistent.query();
      expect(element).toBeNull();
    });
  });

  describe('queryAll', () => {
    it('should find all elements with the same test ID', () => {
      const multipleElements = harness.elements.multiple.queryAll();
      expect(multipleElements.length).toBe(4);
      expect(multipleElements[0].nativeElement.textContent.trim()).toBe('Item 1');
      expect(multipleElements[1].nativeElement.textContent.trim()).toBe('Item 2');
    });

    it('should find all elements within a parent element', () => {
      const containerElement = harness.elements.container.query();
      const multipleElements = harness.elements.multiple.queryAll(containerElement);
      expect(multipleElements.length).toBe(2);
      expect(multipleElements[0].nativeElement.textContent.trim()).toBe('Item 3');
      expect(multipleElements[1].nativeElement.textContent.trim()).toBe('Item 4');
    });

    it('should return empty array if no elements are found', () => {
      const nonExistentHarness = new DebugElementHarness(
        debugElement,
        ['nonexistent'] as const
      );
      const elements = nonExistentHarness.elements.nonexistent.queryAll();
      expect(elements).toEqual([]);
    });
  });

  describe('click', () => {
    it('should click the element', () => {
      const buttonElement = harness.elements.button.query();
      const spy = createSpy().and.callThrough();

      buttonElement.nativeElement.addEventListener('click', spy);
      harness.elements.button.click();

      expect(spy).toHaveBeenCalled();
    });

    it('should throw if element is not found', () => {
      const nonExistentHarness = new DebugElementHarness(
        debugElement,
        ['nonexistent'] as const
      );

      expect(() => nonExistentHarness.elements.nonexistent.click()).toThrowError(NoElementByTestIdFoundError);
    });
  });

  describe('focus', () => {
    it('should focus the element', () => {
      const inputElement = harness.elements.input.query();
      spyOn(inputElement.nativeElement, 'focus');

      harness.elements.input.focus();

      expect(inputElement.nativeElement.focus).toHaveBeenCalled();
    });

    it('should throw if element is not found', () => {
      const nonExistentHarness = new DebugElementHarness(
        debugElement,
        ['nonexistent'] as const
      );

      expect(() => nonExistentHarness.elements.nonexistent.focus()).toThrowError(NoElementByTestIdFoundError);
    });
  });

  describe('getTextContent', () => {
    it('should return the text content of the element', () => {
      const textContent = harness.elements.text.getTextContent();
      expect(textContent).toBe('Some text content');
    });

    it('should throw if element is not found', () => {
      const nonExistentHarness = new DebugElementHarness(
        debugElement,
        ['nonexistent'] as const
      );

      expect(() => nonExistentHarness.elements.nonexistent.getTextContent()).toThrowError(NoElementByTestIdFoundError);
    });
  });
});
