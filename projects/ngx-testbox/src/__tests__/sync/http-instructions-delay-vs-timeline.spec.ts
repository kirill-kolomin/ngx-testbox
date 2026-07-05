import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync } from '@angular/core/testing';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpResponse } from '@angular/common/http';

import { HttpCallInstruction } from '../../../testing/src/interfaces/http-call';
import { runTasksUntilStable } from '../../../testing/src/run-tasks-until-stable';

jasmine.DEFAULT_TIMEOUT_INTERVAL = 60_000;

@Component({
  template: '<div>HTTP instructions</div>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
})
class HttpInstructionsComponent implements OnInit {
  results: string[] = [];

  constructor(private readonly http: HttpClient) {}

  ngOnInit() {
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

describe('HTTP instructions - delay vs timeline', () => {
  let fixture: ComponentFixture<HttpInstructionsComponent>;
  let component: HttpInstructionsComponent;
  let httpTestingController: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpInstructionsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('schedules mixed delay (relative) and timeline (absolute) by resolved keys', fakeAsync(() => {
    fixture = TestBed.createComponent(HttpInstructionsComponent);
    component = fixture.componentInstance;

    const instructions: HttpCallInstruction[] = [
      [
        ['/api/a', 'GET'],
        () => new HttpResponse({ body: { value: 'A' }, status: 200 }),
        { delay: 20 },
      ],
      [
        ['/api/b', 'GET'],
        () => new HttpResponse({ body: { value: 'B' }, status: 200 }),
        { timeline: 20 },
      ],
      [
        ['/api/c', 'GET'],
        () => new HttpResponse({ body: { value: 'C' }, status: 200 }),
        { delay: 30 },
      ],
      [
        ['/api/d', 'GET'],
        () => new HttpResponse({ body: { value: 'D' }, status: 200 }),
        { timeline: 5 },
      ],
      [
        ['/api/e', 'GET'],
        () => new HttpResponse({ body: { value: 'E' }, status: 200 }),
        { delay: 40 },
      ],
      [
        ['/api/f', 'GET'],
        () => new HttpResponse({ body: { value: 'F' }, status: 200 }),
        { timeline: 35 },
      ],
      [
        ['/api/g', 'GET'],
        () => new HttpResponse({ body: { value: 'G' }, status: 200 }),
        { delay: 50 },
      ],
      [
        ['/api/h', 'GET'],
        () => new HttpResponse({ body: { value: 'H' }, status: 200 }),
        { timeline: 60 },
      ],
    ];

    runTasksUntilStable(fixture, {
      httpCallInstructions: instructions,
      debug: false,
      maxAttempts: 50,
    });

    expect(component.results).toEqual(['D', 'A', 'B', 'C', 'F', 'E', 'G', 'H']);
  }));
});
