import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpClient, HttpRequest, HttpResponse, provideHttpClient } from '@angular/common/http';
import { collectHttpCallsAsync } from '../../../testing/src/internals/collect-http-calls-async';
import { NoMatchingHttpInstructionForRequestFoundError } from '../../../testing/src/errors/NoMatchingHttpInstructionForRequestFoundError';
import { getRequestsFromQueue } from '../../../testing/src/internals/get-requests-from-queue';
import { EnrichedHttpInstructionAsync } from '../../../testing/src/internals/enriched-http-instruction';
import { RequestsPassageMediatorAsync } from '../../../testing/src/internals/requests-passage-async-public';

describe('collectHttpCallsAsync', () => {
  let httpClient: HttpClient;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    httpClient = TestBed.inject(HttpClient);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should return all pending requests from the queue', () => {
    httpClient.get('/api/test1').subscribe();
    httpClient.post('/api/test2', { data: 'test' }).subscribe();

    const requests = getRequestsFromQueue(httpTestingController);

    expect(requests.length).toBe(2);
    expect(requests[0].request.method).toBe('GET');
    expect(requests[0].request.url).toBe('/api/test1');
    expect(requests[1].request.method).toBe('POST');
    expect(requests[1].request.url).toBe('/api/test2');

    // Clean up by flushing the requests
    requests.forEach((req) => req.flush({}));
  });

  it('should complete HTTP calls with matching instructions', async () => {
    const responseSpy = jasmine.createSpy('responseSpy');
    httpClient.get('/api/test').subscribe(responseSpy);

    const mediator = new RequestsPassageMediatorAsync(false);

    const mockBody = { data: 'test response' };
    const instructions: EnrichedHttpInstructionAsync[] = [
      [['/api/test', 'GET'], () => new HttpResponse({ body: mockBody, status: 200 }), { callTracker: () => {}, markAsCancelled: () => {} }],
    ];

    const requests = getRequestsFromQueue(httpTestingController);
    collectHttpCallsAsync(instructions, mediator, { testRequests: requests });
    const result = await mediator.passRequests();
    expect(result.shouldStabilizeAfterRequests).toBeTrue();

    expect(responseSpy).toHaveBeenCalledWith(mockBody);
  });

  it('should handle instructions with function checkers', async () => {
    const responseSpy = jasmine.createSpy('responseSpy');
    httpClient.get('/api/test?param=value').subscribe(responseSpy);

    const mediator = new RequestsPassageMediatorAsync(false);
    const mockBody = { data: 'test response' };
    const instructions: EnrichedHttpInstructionAsync[] = [
      [
        (request: HttpRequest<unknown>) => request.method === 'GET' && request.url.includes('/api/test'),
        () => new HttpResponse({ body: mockBody, status: 200 }),
        { callTracker: () => {}, markAsCancelled: () => {} },
      ],
    ];

    const requests = getRequestsFromQueue(httpTestingController);
    collectHttpCallsAsync(instructions, mediator, { testRequests: requests });
    await mediator.passRequests();

    expect(responseSpy).toHaveBeenCalledWith(mockBody);
  });

  it('should throw an error if no matching instruction is found for a request', async () => {
    httpClient.get('/api/test').subscribe();

    const mediator = new RequestsPassageMediatorAsync(false);

    const instructions: EnrichedHttpInstructionAsync[] = [
      [['/api/other', 'GET'], () => new HttpResponse({ body: {}, status: 200 }), { callTracker: () => {}, markAsCancelled: () => {} }],
    ];

    const requests = getRequestsFromQueue(httpTestingController);
    expect(() =>
      collectHttpCallsAsync(instructions, mediator, { testRequests: requests }),
    ).toThrowError(NoMatchingHttpInstructionForRequestFoundError);
  });

  it('should skip cancelled requests', async () => {
    httpClient.get('/api/test').subscribe().unsubscribe();

    const mediator = new RequestsPassageMediatorAsync(false);
    const requests = getRequestsFromQueue(httpTestingController);
    collectHttpCallsAsync([], mediator, { testRequests: requests });
    await mediator.passRequests();

    httpTestingController.verify();
  });
});
