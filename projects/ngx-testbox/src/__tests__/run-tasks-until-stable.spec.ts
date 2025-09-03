import {ChangeDetectionStrategy, Component, Input, NgZone, OnInit} from '@angular/core';
import {ComponentFixture, fakeAsync, TestBed} from '@angular/core/testing';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {HttpClient, HttpResponse, provideHttpClient} from '@angular/common/http';
import {runTasksUntilStable,} from '../../testing/src/run-tasks-until-stable';
import {HttpCallInstruction} from '../../testing/src/complete-http-calls';

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
      this.runIntervalInsideAngular()
    } else {
      this.runIntervalOutsideAngular()
    }
  }

  makeHttpRequest(nextCb?: () => void) {
    return this.httpClient.get('/api/test').subscribe(nextCb);
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
    it('should complete HTTP calls with provided instructions', fakeAsync(() => {
      const httpCallInstructions: HttpCallInstruction[] = [
        [['/api/test', 'GET'], () => new HttpResponse({body: {data: 'test'}, status: 200})]
      ];
      const nextCbSpy = jasmine.createSpy().and.callThrough();

      initComponent();

      component.makeHttpRequest(nextCbSpy);

      runTasksUntilStable(fixture, {httpCallInstructions});

      expect(nextCbSpy).toHaveBeenCalledWith({data: 'test'});
    }));

    it('should throw an error if an HTTP instruction is not invoked', fakeAsync(() => {
      const httpCallInstructions: HttpCallInstruction[] = [
        [['/api/unused', 'GET'], () => new HttpResponse({body: {}, status: 200})]
      ];

      initComponent();

      expect(() => runTasksUntilStable(fixture, {httpCallInstructions}))
        .toThrowError(/There was an http call instruction not called during draining of http requests/);
    }));

    it('should throw an error if an HTTP request is not handled', fakeAsync(() => {
      initComponent();

      component.makeHttpRequest();

      expect(() => runTasksUntilStable(fixture))
        .toThrowError('There is not a defined http instruction for request with url "/api/test" and method "GET"');
    }));
  });

  describe('error handling', () => {
    it('should throw an error if maximum attempts are reached', fakeAsync(() => {
      fixture = TestBed.createComponent(TestComponent);
      component = fixture.componentInstance;

      fixture.componentRef.setInput('isTestingIntervalWithinZone', true);

      expect(() => runTasksUntilStable(fixture)).toThrowError('Maximum attempts reached. Fixture is not stable.');
    }));

    it('should catch HttpErrorResponse errors', fakeAsync(() => {
      const httpCallInstructions: HttpCallInstruction[] = [
        [['/api/test', 'GET'], () => new HttpResponse({body: {}, status: 200})]
      ];

      initComponent();

      component.makeHttpRequest();
      runTasksUntilStable(fixture, {httpCallInstructions});

      expect(() => runTasksUntilStable(fixture, {httpCallInstructions})).toThrowError();
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
        runTasksUntilStable(fixture);
      } catch (error) {}

      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(consoleWarnSpy.calls.mostRecent().args[0]).toContain('setInterval might be the potential problem');

      console.warn = originalConsoleWarn;
    }));

    it('should restore original setInterval after completion', fakeAsync(() => {
      const originalSetInterval = window.setInterval;

      runTasksUntilStable(fixture);

      expect(window.setInterval).toBe(originalSetInterval);
    }));
  });

  function initComponent(httpCallInstructions: HttpCallInstruction[] = []) {
    fixture = TestBed.createComponent(TestComponent);
    component = fixture.componentInstance;

    runTasksUntilStable(fixture, {httpCallInstructions});
  }
});
