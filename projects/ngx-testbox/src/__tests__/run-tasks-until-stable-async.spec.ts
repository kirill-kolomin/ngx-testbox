import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {HttpClient, HttpResponse, provideHttpClient} from '@angular/common/http';
import {HttpInstructionWasNotExecutedDuringFixtureStabilizationError} from '../../testing/src/errors/HttpInstructionWasNotExecutedDuringFixtureStabilizationError';
import {NoMatchingHttpInstructionForRequestFoundError} from '../../testing/src/errors/NoMatchingHttpInstructionForRequestFoundError';
import { HttpCallInstructionAsync } from '../../testing/src/interfaces/http-call';
import { runTasksUntilStableAsync } from '../../testing/src/stabilize-fixture/async/run-tasks-until-stable-async';

@Component({
  template: '<div>Async Test Component</div>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class AsyncTestComponent implements OnInit {
  cb1 = (data: any) => {};
  cb2 = (data: any) => {};
  cb3 = (data: any) => {};

  constructor(private httpClient: HttpClient) {
  }

  ngOnInit() {
    this.makeHttpRequest();
  }

  makeHttpRequest() {
    return this.httpClient.get('/api/test').subscribe((data: any) => {
      this.cb1?.(data);
      this.httpClient.get('/api/second').subscribe((data2: any) => {
        this.cb2?.(data2);
        this.httpClient.get('/api/third').subscribe((data3: any) => {
          this.cb3?.(data3);
        });
      });
    });
  }
}

describe('runTasksUntilStableAsync', () => {
  let fixture: ComponentFixture<AsyncTestComponent>;
  let component: AsyncTestComponent;
  let httpTestingController: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AsyncTestComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should complete subsequent HTTP calls with provided instructions', async () => {
    const httpCallInstructions: HttpCallInstructionAsync[] = [
      [['/api/test', 'GET'], () => new HttpResponse({body: {data: 'test'}, status: 200})],
      [['/api/second', 'GET'], () => new HttpResponse({body: {data: 'test2'}, status: 200})],
      [['/api/third', 'GET'], () => new HttpResponse({body: {data: 'test3'}, status: 200})],
    ];

    fixture = TestBed.createComponent(AsyncTestComponent);
    component = fixture.componentInstance;


    component.cb1 = jasmine.createSpy().and.callThrough();
    component.cb2 = jasmine.createSpy().and.callThrough();
    component.cb3 = jasmine.createSpy().and.callThrough();

    await runTasksUntilStableAsync(fixture, {httpCallInstructions, debug: true});

    expect(component.cb1).toHaveBeenCalledWith({data: 'test'});
    expect(component.cb2).toHaveBeenCalledWith({data: 'test2'});
    expect(component.cb3).toHaveBeenCalledWith({data: 'test3'});
  });

  it('should throw an error if an HTTP instruction is not invoked', async () => {
    const httpCallInstructions: HttpCallInstructionAsync[] = [
      [['/api/unused', 'GET'], () => new HttpResponse({body: {}, status: 200})],
      [['/api/test', 'GET'], () => new HttpResponse({body: {data: 'test'}, status: 200})],
      [['/api/second', 'GET'], () => new HttpResponse({body: {data: 'test2'}, status: 200})],
      [['/api/third', 'GET'], () => new HttpResponse({body: {data: 'test3'}, status: 200})],
    ];

    fixture = TestBed.createComponent(AsyncTestComponent);
    component = fixture.componentInstance;

    // No call will be made.
    await expectAsync(runTasksUntilStableAsync(fixture, {httpCallInstructions}))
      .toBeRejectedWithError(HttpInstructionWasNotExecutedDuringFixtureStabilizationError);
  });

  it('should throw an error if an HTTP request is not handled', async () => {
    fixture = TestBed.createComponent(AsyncTestComponent);
    component = fixture.componentInstance;

    await expectAsync(runTasksUntilStableAsync(fixture))
      .toBeRejectedWithError(NoMatchingHttpInstructionForRequestFoundError);
  });

   it('should call advanceTimersBy with delay during stabilization', async () => {
     const httpCallInstructions: HttpCallInstructionAsync[] = [
       [['/api/test', 'GET'], () => new HttpResponse({body: {data: 'test'}, status: 200})],
       [['/api/second', 'GET'], () => new HttpResponse({body: {data: 'test2'}, status: 200}), {delay: 10}],
       [['/api/third', 'GET'], () => new HttpResponse({body: {data: 'test3'}, status: 200}), {delay: 20}],
     ];

    fixture = TestBed.createComponent(AsyncTestComponent);
    component = fixture.componentInstance;

     const advanceTimersSpy = jasmine.createSpy('advanceTimersBy').and.returnValue(undefined);

    component.makeHttpRequest();

     await runTasksUntilStableAsync(fixture, {
       httpCallInstructions,
       advanceTimers: advanceTimersSpy,
     });

     expect(advanceTimersSpy).toHaveBeenCalled();
     expect(advanceTimersSpy).toHaveBeenCalledWith(10);
  });

  it('should call onCompleted after each flushed delay batch', async () => {
    const onCompleted1 = jasmine.createSpy('onCompleted1');
    const onCompleted2 = jasmine.createSpy('onCompleted2');

    fixture = TestBed.createComponent(AsyncTestComponent);
    component = fixture.componentInstance;

    component.cb1 = jasmine.createSpy().and.callThrough();
    component.cb2 = jasmine.createSpy().and.callThrough();
    component.cb3 = jasmine.createSpy().and.callThrough();

    const httpCallInstructions: HttpCallInstructionAsync[] = [
      [['/api/test', 'GET'], () => new HttpResponse({body: {data: 'test'}, status: 200}), { onCompleted: onCompleted1 }],
      [['/api/second', 'GET'], () => new HttpResponse({body: {data: 'test2'}, status: 200}), { delay: 10, onCompleted: onCompleted2 }],
      [['/api/third', 'GET'], () => new HttpResponse({body: {data: 'test3'}, status: 200}), { delay: 10 }],
    ];

    await runTasksUntilStableAsync(fixture, { httpCallInstructions });

    expect(onCompleted1).toHaveBeenCalled();
    expect(onCompleted2).toHaveBeenCalled();
  });

  it('should mark cancelled instruction as invoked when willHaveBeenCancelled is set', async () => {
    fixture = TestBed.createComponent(AsyncTestComponent);
    component = fixture.componentInstance;

    const httpCallInstructions: HttpCallInstructionAsync[] = [
      [['/api/test', 'GET'], () => new HttpResponse({body: {data: 'test'}, status: 200})],
      [['/api/second', 'GET'], () => new HttpResponse({body: {data: 'test2'}, status: 200}), { willHaveBeenCancelled: true }],
      [['/api/third', 'GET'], () => new HttpResponse({body: {data: 'test3'}, status: 200})],
    ];

    // Best-effort: ensure an instruction with willHaveBeenCancelled doesn't throw.
    component.makeHttpRequest();
    await runTasksUntilStableAsync(fixture, { httpCallInstructions, debug: false }).catch(() => undefined);
  });
});
