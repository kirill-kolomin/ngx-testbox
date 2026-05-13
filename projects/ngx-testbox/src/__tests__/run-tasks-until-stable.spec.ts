import {ChangeDetectionStrategy, Component, Input, NgZone, OnInit} from '@angular/core';
import {ComponentFixture, fakeAsync, TestBed} from '@angular/core/testing';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {HttpClient, HttpResponse, provideHttpClient} from '@angular/common/http';
import {runTasksUntilStable,} from '../../testing/src/run-tasks-until-stable';
import {HttpCallInstruction} from '../../testing/src/complete-http-calls';
import {
  NoMatchingHttpInstructionForRequestFoundError
} from '../../testing/src/errors/NoMatchingHttpInstructionForRequestFoundError';
import {
  HttpInstructionWasNotExecutedDuringFixtureStabilizationError
} from '../../testing/src/errors/HttpInstructionWasNotExecutedDuringFixtureStabilizationError';
import {
  MaximumAttemptsToStabilizeFixtureReachedError
} from '../../testing/src/errors/MaximumAttemptsToStabilizeFixtureReachedError';

@Component({
  template: '<div>Test Component</div>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class TestComponent implements OnInit {
  @Input() isTestingIntervalWithinZone = false;

  constructor(private httpClient: HttpClient, private ngZone: NgZone) {
  }

  ngOnInit() {
    if (this.isTestingIntervalWithinZone) {
      this.runIntervalInsideAngular();
    } else {
      this.runIntervalOutsideAngular();
    }
  }

  makeHttpRequest(nextCb?: (...args: any[]) => void, secondCb?: (...args: any[]) => void, thirdCb?: (...args: any[]) => {}) {
    return this.httpClient.get('/api/test').subscribe((data) => {
      nextCb?.(data);

      this.httpClient.get('/api/second').subscribe((data2) => {
        secondCb?.(data2);

        this.httpClient.get('/api/third').subscribe((data3) => {
          thirdCb?.(data3);
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
    it('should complete all subsequent HTTP calls with provided instructions', fakeAsync(async () => {
      const httpCallInstructions: HttpCallInstruction[] = [
        [['/api/test', 'GET'], () => new HttpResponse({body: {data: 'test'}, status: 200})],
        [['/api/second', 'GET'], () => new HttpResponse({body: {data: 'test2'}, status: 200})],
        [['/api/third', 'GET'], () => new HttpResponse({body: {data: 'test3'}, status: 200})]
      ];
      const nextCbSpy = jasmine.createSpy().and.callThrough();
      const nextCbSpy2 = jasmine.createSpy().and.callThrough();
      const nextCbSpy3 = jasmine.createSpy().and.callThrough();

      initComponent();

      component.makeHttpRequest(nextCbSpy, nextCbSpy2, nextCbSpy3);

      await runTasksUntilStable(fixture, {httpCallInstructions});

      expect(nextCbSpy).toHaveBeenCalledWith({data: 'test'});
      expect(nextCbSpy2).toHaveBeenCalledWith({data: 'test2'});
      expect(nextCbSpy3).toHaveBeenCalledWith({data: 'test3'});
    }));

    it('should throw an error if an HTTP instruction is not invoked', fakeAsync(async () => {
      const httpCallInstructions: HttpCallInstruction[] = [
        [['/api/unused', 'GET'], () => new HttpResponse({body: {}, status: 200})]
      ];

      await initComponent();

      expectAsync(runTasksUntilStable(fixture, {httpCallInstructions}))
        .toBeRejectedWithError(HttpInstructionWasNotExecutedDuringFixtureStabilizationError);
    }));

    it('should throw an error if an HTTP request is not handled', fakeAsync(async () => {
      await initComponent();

      component.makeHttpRequest();

      expectAsync(runTasksUntilStable(fixture))
        .toBeRejectedWithError(NoMatchingHttpInstructionForRequestFoundError);
    }));
  });

  describe('error handling', () => {
    it('should throw an error if maximum attempts are reached', fakeAsync(() => {
      fixture = TestBed.createComponent(TestComponent);
      component = fixture.componentInstance;

      fixture.componentRef.setInput('isTestingIntervalWithinZone', true);

      expectAsync(runTasksUntilStable(fixture)).toBeRejectedWithError(MaximumAttemptsToStabilizeFixtureReachedError);
    }));
  });

  describe('setInterval handling', () => {
    it('should warn when setInterval is used inside Angular zone', fakeAsync(async () => {
      let originalConsoleWarn = console.warn;
      let consoleWarnSpy = jasmine.createSpy('console.warn');
      console.warn = consoleWarnSpy;

      fixture = TestBed.createComponent(TestComponent);
      component = fixture.componentInstance;

      fixture.componentRef.setInput('isTestingIntervalWithinZone', true);

      try {
        await runTasksUntilStable(fixture, {debug: true});
      } catch (error) {
      }

      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(consoleWarnSpy.calls.mostRecent().args[0]).toContain('setInterval detected during fixture stabilization');

      console.warn = originalConsoleWarn;
    }));

    it('should restore original setInterval after completion', fakeAsync(async () => {
      fixture = TestBed.createComponent(TestComponent);
      const originalSetInterval = window.setInterval;

      await runTasksUntilStable(fixture);

      expect(window.setInterval).toBe(originalSetInterval);
    }));
  });

  async function initComponent(httpCallInstructions: HttpCallInstruction[] = []) {
    fixture = TestBed.createComponent(TestComponent);
    component = fixture.componentInstance;

    await runTasksUntilStable(fixture, {httpCallInstructions});
  }
});
