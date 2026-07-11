import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { HttpResponse } from '@angular/common/http';

import { runTasksUntilStableAsync } from '../../../testing/src/run-tasks-until-stable-async';
import { HttpCallInstructionAsync } from '../../../testing/src/interfaces/http-call';
import { provideHttpClient } from '@angular/common/http';

@Component({
  template: '<div>HTTP instructions</div>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
})
class HttpInstructionsAsyncComponent implements OnInit {
  results: string[] = [];

  constructor(private readonly http: HttpClient) {}

  ngOnInit(): void {
    this.http.get('/api/a').subscribe((v: any) => this.results.push(v.value));
    this.http.get('/api/b').subscribe((v: any) => this.results.push(v.value));
    this.http.get('/api/c').subscribe((v: any) => this.results.push(v.value));
    this.http.get('/api/d').subscribe((v: any) => this.results.push(v.value));
    this.http.get('/api/e').subscribe((v: any) => this.results.push(v.value));
    this.http.get('/api/f').subscribe((v: any) => this.results.push(v.value));
    this.http.get('/api/g').subscribe((v: any) => this.results.push(v.value));
    this.http.get('/api/h').subscribe((v: any) => this.results.push(v.value));
  }
}

describe('HTTP instructions async - delay vs timeline', () => {
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpInstructionsAsyncComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('schedules mixed delay (relative) and timeline (absolute) by resolved keys', async () => {
    const fixture = TestBed.createComponent(HttpInstructionsAsyncComponent);
    const component = fixture.componentInstance;

    const instructions: HttpCallInstructionAsync[] = [
      [
        ['/api/a', 'GET'],
        async () => new HttpResponse({ body: { value: 'A' }, status: 200 }),
        { delay: 20 },
      ],
      [
        ['/api/b', 'GET'],
        async () => new HttpResponse({ body: { value: 'B' }, status: 200 }),
        { timeline: 20 },
      ],
      [
        ['/api/c', 'GET'],
        async () => new HttpResponse({ body: { value: 'C' }, status: 200 }),
        { delay: 30 },
      ],
      [
        ['/api/d', 'GET'],
        async () => new HttpResponse({ body: { value: 'D' }, status: 200 }),
        { timeline: 5 },
      ],
      [
        ['/api/e', 'GET'],
        async () => new HttpResponse({ body: { value: 'E' }, status: 200 }),
        { delay: 40 },
      ],
      [
        ['/api/f', 'GET'],
        async () => new HttpResponse({ body: { value: 'F' }, status: 200 }),
        { timeline: 35 },
      ],
      [
        ['/api/g', 'GET'],
        async () => new HttpResponse({ body: { value: 'G' }, status: 200 }),
        { delay: 50 },
      ],
      [
        ['/api/h', 'GET'],
        async () => new HttpResponse({ body: { value: 'H' }, status: 200 }),
        { timeline: 60 },
      ],
    ];

    await runTasksUntilStableAsync(fixture, {
      httpCallInstructions: instructions,
      componentLongRunTimeout: 10_000,
    });

    expect(component.results).toEqual(['D', 'A', 'B', 'C', 'F', 'E', 'G', 'H']);
  });
});
