import {ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {HttpClient, HttpResponse, provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {HttpCallInstructionAsync} from '../../../testing/src/interfaces/http-call';
import {runTasksUntilStableAsync} from '../../../testing/src/run-tasks-until-stable-async';
import {DebugElementHarness} from '../../../testing/src/debug-element-harness';
import {TestIdDirective} from '../../../src/lib/directives/test-id.directive';
import {Subscription} from 'rxjs';
import clock = jasmine.clock;


jasmine.DEFAULT_TIMEOUT_INTERVAL = 600_000;

type Country = 'US' | 'DE';
const testIds = [
  'country',
  'format',
  'formatOption',
  'formatLoading',
  'code',
  'codeOption',
  'codeLoading',
] as const;

@Component({
  standalone: true,
  selector: 'app-country-race-async',
  template: `
    <label>
      Country
      <select class="country" [testboxTestId]="testIds.country" (change)="onCountryChange($event.target.value)">
        <option value="US">US</option>
        <option value="DE">DE</option>
      </select>
    </label>

    <label>
      Format. <span [testboxTestId]="testIds.formatLoading" *ngIf="loadingFormats">Loading...</span>
        <select class="format" testboxTestId="format" [disabled]="loadingFormats || formats.length === 0">
          <option [testboxTestId]="testIds.formatOption" *ngFor="let f of formats" [value]="f">{{f}}</option>
        </select>
    </label>

    <label>
      Bank code. <span [testboxTestId]="testIds.codeLoading" *ngIf="loadingCodes">Loading...</span>
        <select class="code" testboxTestId="code" [disabled]="loadingCodes || codes.length === 0">
          <option [testboxTestId]="testIds.codeOption" *ngFor="let c of codes" [value]="c">{{c}}</option>
      </select>
    </label>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TestIdDirective, CommonModule],
})
class CountryRaceAsyncComponent implements OnInit {
  testIds = TestIdDirective.idsToMap(testIds);

  loadingFormats = false;
  loadingCodes = false;
  currentCountry: Country | '' = '';
  formats: string[] = [];
  codes: string[] = [];

  // Present in sync version; async test focuses on format/code races.
  selectedFormat: string | '' = '';

  #formatsRequest: Subscription = new Subscription();
  #codeRequest: Subscription = new Subscription();

  constructor(private readonly http: HttpClient, private readonly cdr: ChangeDetectorRef) {}

  ngOnInit() {}

  onCountryChange(country: Country) {
    this.loadingFormats = true;
    this.loadingCodes = true;
    this.currentCountry = '';
    this.formats = [];
    this.codes = [];
    this.selectedFormat = '';
    this.cdr.markForCheck();

    this.#formatsRequest.unsubscribe();
    this.#codeRequest.unsubscribe();

    this.#formatsRequest = this.http
      .get<string[]>(`/api/countries/${country}/formats`)
      .subscribe((formats) => {
        // Stale guard: only the latest subscription can update.
        this.formats = formats;
        this.currentCountry = country;
        this.loadingFormats = false;
        this.cdr.markForCheck();
      });

    this.#codeRequest = this.http
      .get<string[]>(`/api/countries/${country}/codes`)
      .subscribe((codes) => {
        this.codes = codes;
        this.loadingCodes = false;
        this.cdr.markForCheck();
      });
  }
}

describe('runTasksUntilStableAsync - country race cancellation and loading state', () => {
  let fixture: ComponentFixture<CountryRaceAsyncComponent>;
  let tick: (delayMs: number) => void | Promise<void>;

  beforeAll(() => {
    tick = clock().install().tick;
  })

  afterAll(() => {
    clock().uninstall();
  })

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CountryRaceAsyncComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  it('renders only the last selected country even when the first country resolves earlier', async () => {
    fixture = TestBed.createComponent(CountryRaceAsyncComponent);
    fixture.detectChanges();

    const harness = new DebugElementHarness(fixture.debugElement, testIds);

    const httpCallInstructions: HttpCallInstructionAsync[] = [
      [
        ['/api/countries/DE/formats', 'GET'],
        () => new HttpResponse({body: ['SEPA'], status: 200}),
        {
          timeline: 2000,
          willHaveBeenCancelled: true,
          onCompleted: () => {
            expect(!!harness.elements.codeLoading.query()).toBe(true);
            expect(harness.elements.codeOption.queryAll().length).toBe(0);
            expect(!!harness.elements.formatLoading.query()).toBe(true);
            expect(harness.elements.formatOption.queryAll().length).toBe(0);
          },
        },
      ],
      [
        ['/api/countries/DE/formats', 'GET'],
        () => new HttpResponse({body: ['SEPA'], status: 200}),
        {
          delay: 200,
          willHaveBeenCancelled: true,
          onCompleted: () => {
            const formatOptions = harness.elements.formatOption.queryAll();

            expect(!!harness.elements.codeLoading.query()).toBe(true);
            expect(harness.elements.codeOption.queryAll().length).toBe(0);
            expect(formatOptions.length).toBe(1);
            expect(formatOptions[0].nativeElement.textContent).toBe('SEPA');
            expect(!!harness.elements.formatLoading.query()).toBe(false);
          },
        },
      ],
      [
        ['/api/countries/US/formats', 'GET'],
        () => new HttpResponse({body: ['ACH', 'DRD'], status: 200}),
        {
          timeline: 4000,
          onCompleted: () => {
            const formatOptions = harness.elements.formatOption.queryAll();
            expect(formatOptions.length).toBe(2);
            expect(formatOptions[0].nativeElement.textContent).toBe('ACH');
            expect(formatOptions[1].nativeElement.textContent).toBe('DRD');
            expect(!!harness.elements.codeLoading.query()).toBe(true);
            expect(harness.elements.codeOption.queryAll().length).toBe(0);
            expect(!!harness.elements.formatLoading.query()).toBe(false);

            // User decides to switch to DE again
            harness.elements.country.changeValue('DE');
          },
        },
      ],
      [
        ['/api/countries/US/codes', 'GET'],
        () => new HttpResponse({body: ['US-WIRE-1', 'US-WIRE-2'], status: 200}),
        {
          timeline: 4500,
          willHaveBeenCancelled: true,
          onCompleted: () => {
            const formatOptions = harness.elements.formatOption.queryAll();
            const codeOptions = harness.elements.codeOption.queryAll();
            expect(formatOptions.length).toBe(1);
            expect(formatOptions[0].nativeElement.textContent).toBe('SEPA');
            expect(!!harness.elements.codeLoading).toBe(true);
            expect(harness.elements.codeOption.queryAll().length).toBe(0);
            expect(!!harness.elements.formatLoading.query()).toBe(false);

            expect(codeOptions.length).toBe(0);
          },
        },
      ],
      [
        ['/api/countries/DE/codes', 'GET'],
        () => new HttpResponse({body: ['DE-ACH-1', 'DE-ACH-2'], status: 200}),
        {
          timeline: 5000,
          willHaveBeenCancelled: true,
          onCompleted: () => {
            const formatOptions = harness.elements.formatOption.queryAll();
            const codeOptions = harness.elements.codeOption.queryAll();
            expect(formatOptions.length).toBe(1);
            expect(formatOptions[0].nativeElement.textContent).toBe('SEPA');
            expect(!!harness.elements.formatLoading.query()).toBe(false);
            // The request was cancelled, the codes will arive in 400ms (look the next instruction)
            expect(!!harness.elements.codeLoading.query()).toBe(true);
            expect(codeOptions.length).toBe(0);
          },
        },
      ],
      [
        ['/api/countries/DE/codes', 'GET'],
        () => new HttpResponse({body: ['DE-ACH-1', 'DE-ACH-2'], status: 200}),
        {
          timeline: 5400,
          onCompleted: () => {
            const formatOptions = harness.elements.formatOption.queryAll();
            const codeOptions = harness.elements.codeOption.queryAll();
            expect(formatOptions.length).toBe(1);
            expect(formatOptions[0].nativeElement.textContent).toBe('SEPA');
            expect(!!harness.elements.codeLoading.query()).toBe(false);
            expect(!!harness.elements.formatLoading.query()).toBe(false);
            expect(codeOptions.length).toBe(2);
            expect(codeOptions[0].nativeElement.textContent).toBe('DE-ACH-1');
            expect(codeOptions[1].nativeElement.textContent).toBe('DE-ACH-2');
          },
        },
      ]
    ];

    harness.elements.country.changeValue('DE');

    // User is quick: switch to US before DE codes arrive.
    setTimeout(() => {
      harness.elements.country.changeValue('US');
    }, 100);

    await runTasksUntilStableAsync(fixture, {
      httpCallInstructions,
      componentLongRunTimeout: 600000,
      advanceTimers: (delayMs) => tick(delayMs)
    });

    const formatOptions = harness.elements.formatOption.queryAll();
    const codeOptions = harness.elements.codeOption.queryAll();
    expect(formatOptions.length).toBe(1);
    expect(formatOptions[0].nativeElement.textContent).toBe('SEPA');
    expect(!!harness.elements.codeLoading.query()).toBe(false);
    expect(!!harness.elements.formatLoading.query()).toBe(false);
    expect(codeOptions.length).toBe(2);
    expect(codeOptions[0].nativeElement.textContent).toBe('DE-ACH-1');
    expect(codeOptions[1].nativeElement.textContent).toBe('DE-ACH-2');
  });
});
