import { TestBed } from '@angular/core/testing';
import { Component, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpResponse } from '@angular/common/http';

import { runTasksUntilStableAsync } from '../../../testing/src/run-tasks-until-stable-async';
import { HttpCallInstructionAsync } from '../../../testing/src/interfaces/http-call';
import { ConflictingHttpInstructionParamsError } from '../../../testing/src/errors/ConflictingHttpInstructionParamsError';
import { HttpInstructionTimelineExceededError } from '../../../testing/src/errors/HttpInstructionTimelineExceededError';

@Component({
  template: '<div>HTTP errors</div>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
})
class HttpErrorsAsyncComponent implements OnInit {
  constructor(private readonly http: HttpClient) {}
  ngOnInit(): void {
    this.http.get('/api/a').subscribe(() => {});
  }
}

describe('async/await HTTP instructions async errors', () => {
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpErrorsAsyncComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('throws on conflicting params (both delay and timeline)', async () => {
    const fixture = TestBed.createComponent(HttpErrorsAsyncComponent);

    const instructions: HttpCallInstructionAsync[] = [
      [
        ['/api/a', 'GET'],
        async () => new HttpResponse({ body: { value: 'A' }, status: 200 }),
        { delay: 10, timeline: 5 },
      ],
    ];

    let error: unknown;
    try {
      await runTasksUntilStableAsync(fixture, {
        httpCallInstructions: instructions,
        componentLongRunTimeout: 10_000,
      });
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(ConflictingHttpInstructionParamsError);
  });

  it('throws when timeline is already in the past when request is registered', async () => {
    const fixture = TestBed.createComponent(HttpErrorsAsyncComponent);

    const instructions: HttpCallInstructionAsync[] = [
      [
        ['/api/a', 'GET'],
        async () => new HttpResponse({ body: { value: 'A' }, status: 200 }),
        { timeline: -1 },
      ],
    ];

    let error: unknown;
    try {
      await runTasksUntilStableAsync(fixture, {
        httpCallInstructions: instructions,
        componentLongRunTimeout: 10_000,
      });
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(HttpInstructionTimelineExceededError);
  });
});
