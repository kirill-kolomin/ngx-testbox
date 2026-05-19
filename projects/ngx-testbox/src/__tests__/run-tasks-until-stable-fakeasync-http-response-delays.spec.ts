import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';
import {ComponentFixture, TestBed, fakeAsync} from '@angular/core/testing';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {HttpClient, provideHttpClient} from '@angular/common/http';
import {HttpResponse} from '@angular/common/http';
import { HttpCallInstruction } from '../../testing/src/interfaces/http-call';
import { runTasksUntilStable } from '../../testing/src/stabilize-fixture/sync/run-tasks-until-stable';

jasmine.DEFAULT_TIMEOUT_INTERVAL = 70_000;

const TOTAL_CALLS = 10;

@Component({
  template: '<div>Delay Test</div>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class DelayHttpComponent implements OnInit {
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

describe('runTasksUntilStable - HTTP response delays', () => {
  let fixture: ComponentFixture<DelayHttpComponent>;
  let component: DelayHttpComponent;
  let httpTestingController: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DelayHttpComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('stabilizes and completes callbacks for 10 sequential delayed HTTP responses', fakeAsync(() => {
    fixture = TestBed.createComponent(DelayHttpComponent);
    component = fixture.componentInstance;

    const instructions: HttpCallInstruction[] = Array.from({length: TOTAL_CALLS}).map((_, idx) => {
      const i = idx + 1;
      return [
        [`/api/n-${idx}`, 'GET'],
        () => new HttpResponse({body: {value: `value-${i}`}, status: 200}),
        i * 1000
      ];
    });

    runTasksUntilStable(fixture, {
      eventualTimeAdvance: 500,
      httpCallInstructions: instructions,
      debug: false,
      maxAttempts: 100
    });

    expect(component.results).toEqual(
      Array.from({length: TOTAL_CALLS}).map((_, idx) => `value-${idx + 1}`),
    );
  }));
});
