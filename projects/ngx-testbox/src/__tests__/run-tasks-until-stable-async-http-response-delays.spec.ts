import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {HttpClient, HttpResponse, provideHttpClient} from '@angular/common/http';
import { HttpCallInstructionAsync } from '../../testing/src/interfaces/http-call';
import { runTasksUntilStableAsync } from '../../testing/src/run-tasks-until-stable-async';

jasmine.DEFAULT_TIMEOUT_INTERVAL = 60_000;

const TOTAL_CALLS = 10;

@Component({
  template: '<div>Delay Test Async</div>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class DelayHttpComponentAsync implements OnInit {
  results: string[] = [];

  constructor(private readonly http: HttpClient) {}

  ngOnInit() {
    const makeRequest = (i: number) => {
      this.http.get(`/api/n-${i}`).subscribe((v: any) => {
        this.results.push(v.value);
        if (i < (TOTAL_CALLS - 1)) {
          makeRequest(i + 1);
        }
      });
    };

    makeRequest(0);
  }
}

describe('runTasksUntilStableAsync - HTTP response delays', () => {
  let fixture: ComponentFixture<DelayHttpComponentAsync>;
  let component: DelayHttpComponentAsync;
  let httpTestingController: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DelayHttpComponentAsync],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('stabilizes and completes callbacks for 10 sequential delayed HTTP responses', async () => {
    fixture = TestBed.createComponent(DelayHttpComponentAsync);
    component = fixture.componentInstance;

    const instructions: HttpCallInstructionAsync[] = Array.from({length: TOTAL_CALLS}).map((_, idx) => {
      const i = idx + 1;
      return [
        [`/api/n-${idx}`, 'GET'],
        () => new HttpResponse({body: {value: `value-${i}`}, status: 200}),
        { delay: i * 300 },
      ];
    });

    // Use real timers; without advanceTimers the library falls back to setTimeout.
    await runTasksUntilStableAsync(fixture, {
      httpCallInstructions: instructions,
      // Total delay for i=1..10 is 55s; give some headroom for scheduling.
      componentLongRunTimeout: 90_000,
      debug: false,
    });

    expect(component.results).toEqual(
      Array.from({length: TOTAL_CALLS}).map((_, idx) => `value-${idx + 1}`),
    );
  });
});
