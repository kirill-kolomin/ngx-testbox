import {TestBed} from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import {HttpClient, HttpResponse, provideHttpClient} from '@angular/common/http';
import {
  completeHttpCallsAsync,
} from '../../testing/src/stabilize-fixture/async/complete-http-calls-async';
import { EnrichedHttpInstructionAsync } from '../../testing/src/internals/enriched-http-instruction';

jasmine.DEFAULT_TIMEOUT_INTERVAL = 60_000;

const TOTAL_CALLS = 10;

describe('completeHttpCalls - HTTP response delays', () => {
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

  it('flushes 10 queued GET requests using increasing delayed response getters', async () => {
    const received: string[] = [];

    const makeRequest = (i: number) => {
      httpClient.get(`/api/n-${i}`).subscribe((v: any) => {
        received.push(v.value);
        if (i < TOTAL_CALLS - 1) {
          makeRequest(i + 1);
        }
      });
    };

    makeRequest(0);
    let index = 0;

    const instructions: EnrichedHttpInstructionAsync[] = Array.from({length: TOTAL_CALLS}).map((_, idx) => {
      const i = idx + 1;
      return [
        [`/api/n-${idx}`, 'GET'],
        async () => {
          await new Promise<void>((resolve) => setTimeout(resolve, i * 300));
          index++;
          return new HttpResponse({body: {value: `value-${i}`}, status: 200});
        },
        {callTracker: () => {}, markAsCancelled: () => {}}
      ];
    });

    while(index < TOTAL_CALLS) {
      await completeHttpCallsAsync(instructions);
      await new Promise(resolve => setTimeout(() => resolve(undefined), 16))
    }

    expect(received).toEqual(
      Array.from({length: TOTAL_CALLS}).map((_, idx) => `value-${idx + 1}`),
    );
  });
});
