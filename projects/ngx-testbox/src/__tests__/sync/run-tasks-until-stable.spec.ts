import {ChangeDetectionStrategy, Component, Input, NgZone, OnInit} from '@angular/core';
import {ComponentFixture, fakeAsync, TestBed} from '@angular/core/testing';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {HttpClient, HttpResponse, provideHttpClient} from '@angular/common/http';
import {
  NoMatchingHttpInstructionForRequestFoundError
} from '../../../testing/src/errors/NoMatchingHttpInstructionForRequestFoundError';
import {
  HttpInstructionWasNotExecutedDuringFixtureStabilizationError
} from '../../../testing/src/errors/HttpInstructionWasNotExecutedDuringFixtureStabilizationError';
import {
  MaximumAttemptsToStabilizeFixtureReachedError
} from '../../../testing/src/errors/MaximumAttemptsToStabilizeFixtureReachedError';
import { HttpCallInstruction } from '../../../testing/src/interfaces/http-call';
import { runTasksUntilStable } from '../../../testing/src/run-tasks-until-stable';

@Component({
  template: '<div>Test Component</div>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class TestComponent implements OnInit {
  cb1 = (data: any) => {};
  cb2 = (data: any) => {};
  cb3 = (data: any) => {};

  @Input() isTestingIntervalWithinZone = false;
  @Input() isTestingRequestSequence = false;

  constructor(private httpClient: HttpClient, private ngZone: NgZone) {
  }

  ngOnInit() {
    if(this.isTestingRequestSequence) {
      this.makeHttpRequest();
    }

    if (this.isTestingIntervalWithinZone) {
      this.runIntervalInsideAngular();
    } else {
      this.runIntervalOutsideAngular();
    }
  }

  makeHttpRequest() {
    return this.httpClient.get('/api/test').subscribe((data) => {
      this.cb1(data);

      this.httpClient.get('/api/second').subscribe((data2) => {
        this.cb2(data2);

        this.httpClient.get('/api/third').subscribe((data3) => {
          this.cb3(data3);
        })
      })
    });
  }

  runIntervalOutsideAngular() {
    this.ngZone.runOutsideAngular(() => {
      setInterval(() => {
      }, 1000);
    });
  }

  runIntervalInsideAngular() {
    setInterval(() => {
    }, 1000);
  }
}

describe('runTasksUntilStable', () => {
  let fixture: ComponentFixture<TestComponent>;
  let component: TestComponent;
  let httpTestingController: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  describe('HTTP handling', () => {
    it('should complete all subsequent HTTP calls with provided instructions', fakeAsync(() => {
      const httpCallInstructions: HttpCallInstruction[] = [
        [['/api/test', 'GET'], () => new HttpResponse({body: {data: 'test'}, status: 200})],
        [['/api/second', 'GET'], () => new HttpResponse({body: {data: 'test2'}, status: 200})],
        [['/api/third', 'GET'], () => new HttpResponse({body: {data: 'test3'}, status: 200})]
      ];

      initComponent(true, false, [], false);

      component.cb1 = jasmine.createSpy().and.callThrough();
      component.cb2 = jasmine.createSpy().and.callThrough();
      component.cb3 = jasmine.createSpy().and.callThrough();

      runTasksUntilStable(fixture, {httpCallInstructions});

      expect(component.cb1).toHaveBeenCalledWith({data: 'test'});
      expect(component.cb2).toHaveBeenCalledWith({data: 'test2'});
      expect(component.cb3).toHaveBeenCalledWith({data: 'test3'});
    }));

    it('should throw an error if an HTTP instruction is not invoked', fakeAsync(() => {
      const httpCallInstructions: HttpCallInstruction[] = [
        [['/api/unused', 'GET'], () => new HttpResponse({body: {}, status: 200})]
      ];

      initComponent(false, false);

      expect(() => runTasksUntilStable(fixture, {httpCallInstructions}))
        .toThrowError(HttpInstructionWasNotExecutedDuringFixtureStabilizationError);
    }));

    it('should throw an error if an HTTP request is not handled', fakeAsync(() => {
      expect(() => initComponent(true, false))
        .toThrowError(NoMatchingHttpInstructionForRequestFoundError);
    }));
  });

  describe('error handling', () => {
    it('should throw an error if maximum attempts are reached', fakeAsync(() => {
      let error: Error | null = null;

      try {
        initComponent(false, true);
      } catch (e: any) {
        error = e;
      }

      expect(error instanceof MaximumAttemptsToStabilizeFixtureReachedError).toBe(true);
    }));
  });

  describe('setInterval handling', () => {
    it('should warn when setInterval is used inside Angular zone', fakeAsync(() => {
      let originalConsoleWarn = console.warn;
      let consoleWarnSpy = jasmine.createSpy('console.warn');
      console.warn = consoleWarnSpy;

      fixture = TestBed.createComponent(TestComponent);
      component = fixture.componentInstance;

      fixture.componentRef.setInput('isTestingIntervalWithinZone', true);

      try {
        runTasksUntilStable(fixture, {debug: true});
      } catch (error) {
      }

      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(consoleWarnSpy.calls.mostRecent().args[0]).toContain('setInterval detected during fixture stabilization');

      console.warn = originalConsoleWarn;
    }));

    it('should restore original setInterval after completion', fakeAsync(() => {
      fixture = TestBed.createComponent(TestComponent);
      const originalSetInterval = window.setInterval;

      runTasksUntilStable(fixture);

      expect(window.setInterval).toBe(originalSetInterval);
    }));
  });

  function initComponent(testingSequence: boolean, testingInterval: boolean, httpCallInstructions: HttpCallInstruction[] = [], shouldRunTasks = true) {
    fixture = TestBed.createComponent(TestComponent);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('isTestingRequestSequence', testingSequence);
    fixture.componentRef.setInput('isTestingIntervalWithinZone', testingInterval);

    if(shouldRunTasks) {
      runTasksUntilStable(fixture, {httpCallInstructions});
    }
  }
});
