import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync } from '@angular/core/testing';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpResponse } from '@angular/common/http';

import { HttpCallInstruction } from '../../../testing/src/interfaces/http-call';
import { runTasksUntilStable } from '../../../testing/src/run-tasks-until-stable';
import { ConflictingHttpInstructionParamsError } from '../../../testing/src/errors/ConflictingHttpInstructionParamsError';
import { HttpInstructionTimelineExceededError } from '../../../testing/src/errors/HttpInstructionTimelineExceededError';

@Component({
  template: '<div>HTTP errors</div>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
})
class HttpErrorsComponent implements OnInit {
  constructor(private readonly http: HttpClient) {}
  ngOnInit() {
    this.http.get('/api/a').subscribe(() => {});
  }
}

describe('fakeAsync HTTP instructions errors', () => {
  let fixture: ComponentFixture<HttpErrorsComponent>;
  let httpTestingController: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpErrorsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('throws on conflicting params (both delay and timeline)', fakeAsync(() => {
    fixture = TestBed.createComponent(HttpErrorsComponent);

    const instructions: HttpCallInstruction[] = [
      [
        ['/api/a', 'GET'],
        () => new HttpResponse({ body: { value: 'A' }, status: 200 }),
        { delay: 10, timeline: 5 },
      ],
    ];

    expect(() => {
      runTasksUntilStable(fixture, {
        httpCallInstructions: instructions,
        debug: false,
        maxAttempts: 10,
      });
    }).toThrowError(ConflictingHttpInstructionParamsError);
  }));

  it('throws when timeline is already in the past when request is registered', fakeAsync(() => {
    fixture = TestBed.createComponent(HttpErrorsComponent);

    const pastTimelineInstructions: HttpCallInstruction[] = [
      [
        ['/api/a', 'GET'],
        () => new HttpResponse({ body: { value: 'A' }, status: 200 }),
        // register at timePassed=0, timeline=-1 is already in the past.
        { timeline: -1 },
      ],
    ];

    expect(() => {
      runTasksUntilStable(fixture, {
        httpCallInstructions: pastTimelineInstructions,
        debug: false,
        maxAttempts: 10,
      });
    }).toThrowError(HttpInstructionTimelineExceededError);
  }));
});
