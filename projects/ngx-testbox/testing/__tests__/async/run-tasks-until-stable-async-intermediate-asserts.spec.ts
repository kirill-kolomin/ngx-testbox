import {ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {HttpClient, HttpResponse, provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {HttpCallInstructionAsync} from '../../../testing/src/interfaces/http-call';
import {runTasksUntilStableAsync} from '../../../testing/src/run-tasks-until-stable-async';
import {DebugElementHarness} from '../../../testing/src/debug-element-harness';
import {TestIdDirective} from 'src/lib/directives/test-id.directive';

jasmine.DEFAULT_TIMEOUT_INTERVAL = 60_000;

@Component({
  standalone: true,
  selector: 'app-intermediate-asserts-async',
  template: '<div testboxTestId="vm">{{vmText}}</div>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TestIdDirective],
})
class IntermediateAssertsAsyncComponent implements OnInit {
  vmText = '';

  constructor(
    private readonly http: HttpClient,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.http.get<{value: string}>('/api/first').subscribe((res) => {
      this.vmText = res.value;
      this.cdr.markForCheck();
    });

    // Second request scheduled immediately; interleaving is handled by stabilization.
    this.http.get<{value: string}>('/api/second').subscribe((res) => {
      this.vmText = res.value;
      this.cdr.markForCheck();
    });
  }
}

describe('runTasksUntilStableAsync - intermediate assertion callbacks', () => {
  let fixture: ComponentFixture<IntermediateAssertsAsyncComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IntermediateAssertsAsyncComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  it('runs asserts between request-passage cycles and observes latest state', async () => {
    fixture = TestBed.createComponent(IntermediateAssertsAsyncComponent);
    const harness = new DebugElementHarness(fixture.debugElement, ['vm'] as const);
    const seen: string[] = [];

    const readText = () => harness.elements.vm.getTextContent().trim();

    const instructions: HttpCallInstructionAsync[] = [
      [
        ['/api/first', 'GET'],
        () => new HttpResponse({body: {value: 'first'}, status: 200}),
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

    await runTasksUntilStableAsync(fixture, {
      httpCallInstructions: instructions,
      debug: false,
    });

    expect(readText()).toBe('second');
    expect(seen.length).toBe(2);
    expect(seen[0]).toBe('first');
    expect(seen[1]).toBe('second');
  });
});
