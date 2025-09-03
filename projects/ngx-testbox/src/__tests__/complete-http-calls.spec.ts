import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import {HttpClient, HttpRequest, HttpResponse, provideHttpClient} from '@angular/common/http';
import {
  completeHttpCalls,
  getRequestsFromQueue,
  HttpCallInstruction
} from '../../testing/src/complete-http-calls';
import {
  NoMatchingHttpInstructionForRequestFoundError
} from '../../testing/src/errors/NoMatchingHttpInstructionForRequestFoundError';

describe('completeHttpCalls', () => {
  let httpClient: HttpClient;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });

    httpClient = TestBed.inject(HttpClient);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  describe('getRequestsFromQueue', () => {
    it('should return all pending requests from the queue', () => {
      // Make some HTTP requests
      httpClient.get('/api/test1').subscribe();
      httpClient.post('/api/test2', { data: 'test' }).subscribe();

      // Get requests from queue
      const requests = getRequestsFromQueue(httpTestingController);

      // Verify we got both requests
      expect(requests.length).toBe(2);
      expect(requests[0].request.method).toBe('GET');
      expect(requests[0].request.url).toBe('/api/test1');
      expect(requests[1].request.method).toBe('POST');
      expect(requests[1].request.url).toBe('/api/test2');

      // Clean up by flushing the requests
      requests.forEach(req => req.flush({}));
    });

    it('should return an empty array if there are no pending requests', () => {
      const requests = getRequestsFromQueue(httpTestingController);
      expect(requests).toEqual([]);
    });
  });

  describe('completeHttpCalls', () => {
    it('should complete HTTP calls with matching instructions', () => {
      const responseSpy = jasmine.createSpy('responseSpy');

      httpClient.get('/api/test').subscribe(responseSpy);

      const mockBody = { data: 'test response' };
      const instructions: HttpCallInstruction[] = [
        [['/api/test', 'GET'], () => new HttpResponse({ body: mockBody, status: 200 })]
      ];

      completeHttpCalls(instructions);

      expect(responseSpy).toHaveBeenCalledWith(mockBody);
    });

    it('should handle instructions with function checkers', () => {
      const responseSpy = jasmine.createSpy('responseSpy');

      httpClient.get('/api/test?param=value').subscribe(responseSpy);

      const mockBody = { data: 'test response' };
      const instructions: HttpCallInstruction[] = [
        [
          (request: HttpRequest<unknown>) =>
            request.method === 'GET' && request.url.includes('/api/test'),
          () => new HttpResponse({ body: mockBody, status: 200 })
        ]
      ];

      completeHttpCalls(instructions);

      expect(responseSpy).toHaveBeenCalledWith(mockBody);
    });

    it('should handle instructions with RegExp path matchers', () => {
      const responseSpy = jasmine.createSpy('responseSpy');

      httpClient.get('/api/users/123').subscribe(responseSpy);

      const mockBody = { id: 123, name: 'Test User' };
      const instructions: HttpCallInstruction[] = [
        [[/\/api\/users\/\d+/, 'GET'], () => new HttpResponse({ body: mockBody, status: 200 })]
      ];

      completeHttpCalls(instructions);

      expect(responseSpy).toHaveBeenCalledWith(mockBody);
    });

    it('should pass request and search params to the response getter', () => {
      const responseGetterSpy = jasmine.createSpy('responseGetter').and.returnValue(
        new HttpResponse({ body: {}, status: 200 })
      );

      httpClient.get('/api/test?param1=value1&param2=value2').subscribe();

      const instructions: HttpCallInstruction[] = [
        [['/api/test', 'GET'], responseGetterSpy]
      ];

      completeHttpCalls(instructions);

      expect(responseGetterSpy).toHaveBeenCalled();

      const [request, searchParams] = responseGetterSpy.calls.mostRecent().args;
      expect(request.method).toBe('GET');
      expect(request.url).toBe('/api/test?param1=value1&param2=value2');
      expect(searchParams.get('param1')).toBe('value1');
      expect(searchParams.get('param2')).toBe('value2');
    });

    it('should throw an error if no matching instruction is found for a request', () => {
      httpClient.get('/api/test').subscribe();

      const instructions: HttpCallInstruction[] = [
        [['/api/other', 'GET'], () => new HttpResponse({ body: {}, status: 200 })]
      ];

      expect(() => completeHttpCalls(instructions))
        .toThrowError(NoMatchingHttpInstructionForRequestFoundError);
    });

    it('should skip cancelled requests', () => {
      httpClient.get('/api/test').subscribe().unsubscribe();

      completeHttpCalls([]);

      httpTestingController.verify();
    });
  });
});
