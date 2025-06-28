import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TestIdDirective } from './test-id.directive';
import { By } from '@angular/platform-browser';

@Component({
  template: `<div [testboxTestId]="testId"></div>`,
  standalone: true,
  imports: [TestIdDirective]
})
class TestHostComponent {
  testId = 'test-element-id';
}

describe('TestIdDirective', () => {
  describe('with valid input', () => {
    let component: TestHostComponent;
    let fixture: ComponentFixture<TestHostComponent>;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [TestHostComponent]
      }).compileComponents();

      fixture = TestBed.createComponent(TestHostComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should create component with directive', () => {
      expect(component).toBeTruthy();
    });

    it('should set test attribute with provided value', () => {
      const element = fixture.debugElement.query(By.directive(TestIdDirective));
      expect(element.nativeElement.getAttribute(TestIdDirective.testAttribute))
        .toBe('test-element-id');
    });
  });
});
