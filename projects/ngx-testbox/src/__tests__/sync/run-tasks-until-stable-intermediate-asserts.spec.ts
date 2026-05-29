import {ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {ComponentFixture, fakeAsync, TestBed} from '@angular/core/testing';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {HttpClient, HttpResponse, provideHttpClient} from '@angular/common/http';
import {HttpCallInstruction} from '../../../testing/src/interfaces/http-call';
import {runTasksUntilStable} from '../../../testing/src/run-tasks-until-stable';
import {DebugElementHarness} from '../../../testing/src/debug-element-harness';
import {TestIdDirective} from '../../lib/directives/test-id.directive';

jasmine.DEFAULT_TIMEOUT_INTERVAL = 60_000;

@Component({
  standalone: true,
  selector: 'app-intermediate-asserts',
  template: '<div testboxTestId="vm">{{vmText}}</div>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TestIdDirective],
})
class IntermediateAssertsComponent implements OnInit {
  vmText = '';

  constructor(private readonly http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.http.get<{value: string}>('/api/first').subscribe((res) => {
      this.vmText = res.value;
      this.cdr.markForCheck();
    });

    // Second request scheduled immediately; interleaving is handled by the test stabilization loop.
    this.http.get<{value: string}>('/api/second').subscribe((res) => {
      this.vmText = res.value;
      this.cdr.markForCheck();
    });
  }
}

describe('runTasksUntilStable (fakeAsync) - intermediate assertion callbacks', () => {
  let fixture: ComponentFixture<IntermediateAssertsComponent>;
  let httpTestingController: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IntermediateAssertsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('runs asserts between request-passage cycles and observes latest state', fakeAsync(() => {
    fixture = TestBed.createComponent(IntermediateAssertsComponent);
    const harness = new DebugElementHarness(fixture.debugElement, ['vm'] as const);
    const seen: string[] = [];

    const readText = () => harness.elements.vm.getTextContent().trim();

    const instructions: HttpCallInstruction[] = [
      [
        ['/api/first', 'GET'],
        () => new HttpResponse({body: {value: 'first'}, status: 200}),
        // Ensure it resolves earlier than the second.
        {
          delay: 100,
          onCompleted: () => {
            const text = readText();
            seen.push(text);
            expect(text).toBe('first');
          },
        },
      ],
      [
        ['/api/second', 'GET'],
        () => new HttpResponse({body: {value: 'second'}, status: 200}),
        // Resolve later.
        {
          delay: 300,
          onCompleted: () => {
            const text = readText();
            seen.push(text);
            expect(text).toBe('second');
          },
        },
      ],
    ];

    runTasksUntilStable(fixture, {
      eventualTimeAdvance: 1,
      httpCallInstructions: instructions,
      debug: false,
      maxAttempts: 50,
    });

    expect(readText()).toBe('second');
    expect(seen.length).toBe(2);
    expect(seen[0]).toBe('first');
    expect(seen[1]).toBe('second');
  }));
});
