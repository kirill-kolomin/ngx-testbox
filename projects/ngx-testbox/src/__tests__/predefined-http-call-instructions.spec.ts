import {HttpHeaders, HttpRequest, HttpResponse} from '@angular/common/http';
import {
  getPredefinedResponseGetter,
  httpMethods, httpStatuses,
  predefinedHttpCallInstructions
} from '../../testing/src/predefined-http-call-instructions';
import { EndpointPath, HttpCallInstruction } from '../../testing/src/complete-http-calls';

describe('predefinedHttpCallInstructions', () => {
  describe('getPredefinedResponseGetter', () => {
    let mockRequest: HttpRequest<unknown>;
    let mockSearchParams: URLSearchParams;

    beforeEach(() => {
      mockRequest = new HttpRequest('GET', 'api/test');
      mockSearchParams = new URLSearchParams();
    });

    describe('success response', () => {
      it('should create a response getter that returns a success response with status 200', () => {
        const responseGetter = getPredefinedResponseGetter('success');
        const response = responseGetter(mockRequest, mockSearchParams);

        expect(response).toBeInstanceOf(HttpResponse);
        expect(response.status).toBe(200);
        expect(response.statusText).toBe('OK');
        expect(response.body).toBeNull();
      });

      it('should include the body from the original response getter', () => {
        const mockBody = { data: 'test data' };
        const originalResponseGetter = () => mockBody;
        const responseGetter = getPredefinedResponseGetter('success', originalResponseGetter);
        const response = responseGetter(mockRequest, mockSearchParams);

        expect(response).toBeInstanceOf(HttpResponse);
        expect(response.status).toBe(200);
        expect(response.statusText).toBe('OK');
        expect(response.body).toEqual(mockBody);
      });

      it('should handle an HttpResponse from the original response getter', () => {
        const mockBody = { data: 'test data' };
        const mockHeaders = { 'Content-Type': 'application/json' };
        const originalResponseGetter = () => new HttpResponse({
          body: mockBody,
          headers: new HttpHeaders(mockHeaders)
        });
        const responseGetter = getPredefinedResponseGetter('success', originalResponseGetter);
        const response = responseGetter(mockRequest, mockSearchParams);

        expect(response).toBeInstanceOf(HttpResponse);
        expect(response.status).toBe(200);
        expect(response.statusText).toBe('OK');
        expect(response.body).toEqual(mockBody);
        expect(response.headers.get('Content-Type')).toBe('application/json');
      });
    });

    describe('error response', () => {
      it('should create a response getter that returns an error response with status 500', () => {
        const responseGetter = getPredefinedResponseGetter('error');
        const response = responseGetter(mockRequest, mockSearchParams);

        expect(response).toBeInstanceOf(HttpResponse);
        expect(response.status).toBe(500);
        expect(response.statusText).toBe('Internal Server Error');
        expect(response.body).toBeNull();
      });

      it('should include the body from the original response getter', () => {
        const mockBody = { error: 'test error' };
        const originalResponseGetter = () => mockBody;
        const responseGetter = getPredefinedResponseGetter('error', originalResponseGetter);
        const response = responseGetter(mockRequest, mockSearchParams);

        expect(response).toBeInstanceOf(HttpResponse);
        expect(response.status).toBe(500);
        expect(response.statusText).toBe('Internal Server Error');
        expect(response.body).toEqual(mockBody);
      });
    });
  });

  describe('predefinedHttpCallInstructions', () => {
    const testEndpoint: EndpointPath = 'api/test';

    it('should have all HTTP methods defined', () => {
      for (const method of httpMethods) {
        expect(predefinedHttpCallInstructions[method]).toBeDefined();
      }
    });

    it('should have success and error status types for each HTTP method', () => {
      for (const method of httpMethods) {
        for (const status of httpStatuses) {
          expect(predefinedHttpCallInstructions[method][status]).toBeDefined();
          expect(typeof predefinedHttpCallInstructions[method][status]).toBe('function');
        }
      }
    });

    it('should create valid HttpCallInstructions for GET success', () => {
      const instruction: HttpCallInstruction = predefinedHttpCallInstructions.get.success(testEndpoint);

      // Check the structure of the instruction
      expect(Array.isArray(instruction)).toBe(true);
      expect(instruction.length).toBe(2);

      // Check the first element (HttpCallChecker)
      const checker = instruction[0];
      expect(Array.isArray(checker)).toBe(true);
      expect((checker as Array<any>)[0]).toBe(testEndpoint);
      expect((checker as Array<any>)[1]).toBe('GET');

      // Check the second element (ResponseGetter)
      const responseGetter = instruction[1];
      expect(typeof responseGetter).toBe('function');

      // Test the response getter
      const mockRequest = new HttpRequest('GET', testEndpoint);
      const mockSearchParams = new URLSearchParams();
      const response = responseGetter(mockRequest, mockSearchParams);

      expect(response).toBeInstanceOf(HttpResponse);
      expect(response.status).toBe(200);
      expect(response.statusText).toBe('OK');
    });

    it('should create valid HttpCallInstructions for POST error', () => {
      const mockErrorBody = { error: 'Test error' };
      const instruction: HttpCallInstruction = predefinedHttpCallInstructions.post.error(
        testEndpoint,
        () => mockErrorBody
      );

      // Check the structure of the instruction
      expect(Array.isArray(instruction)).toBe(true);
      expect(instruction.length).toBe(2);

      // Check the first element (HttpCallChecker)
      const checker = instruction[0];

      expect(Array.isArray(checker)).toBe(true);

        expect((checker as Array<any>)[0]).toBe(testEndpoint);
        expect((checker as Array<any>)[1]).toBe('POST');

      // Check the second element (ResponseGetter)
      const responseGetter = instruction[1];
      expect(typeof responseGetter).toBe('function');

      // Test the response getter
      const mockRequest = new HttpRequest('POST', testEndpoint, null);
      const mockSearchParams = new URLSearchParams();
      const response = responseGetter(mockRequest, mockSearchParams);

      expect(response).toBeInstanceOf(HttpResponse);
      expect(response.status).toBe(500);
      expect(response.statusText).toBe('Internal Server Error');
      expect(response.body).toEqual(mockErrorBody);
    });

    it('should pass request and search params to the custom response getter', () => {
      const spy = jasmine.createSpy('responseGetter').and.returnValue({ custom: 'data' });
      const instruction: HttpCallInstruction = predefinedHttpCallInstructions.get.success(testEndpoint, spy);

      const mockRequest = new HttpRequest('GET', `${testEndpoint}?param=value`);
      const mockSearchParams = new URLSearchParams('param=value');
      const responseGetter = instruction[1];

      responseGetter(mockRequest, mockSearchParams);

      expect(spy).toHaveBeenCalledWith(mockRequest, mockSearchParams);
    });
  });
});
