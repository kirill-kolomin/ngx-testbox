import {
  ChangeDetectionStrategy,
  Directive,
  Input,
  Component,
  ViewContainerRef,
  inject,
  OnInit,
  ChangeDetectorRef,
} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {HttpClient, HttpResponse, provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting, HttpTestingController} from '@angular/common/http/testing';
import { HttpCallInstructionAsync } from '../../../testing/src/interfaces/http-call';
import { runTasksUntilStableAsync } from '../../../testing/src/run-tasks-until-stable-async';

type CurrencySymbolResponse = {currency: string; symbol: string};
type MoneyLimitResponse = {limit: number};
type AllowanceResponse = {allowed: boolean};

@Component({
  standalone: true,
  selector: 'app-b',
  template: ` <span class="allowed">Allowed: {{ allowedText() }}</span> `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class ComponentB {
  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);

  @Input({required: true}) currency!: string;
  @Input({required: true}) limit!: number;

  allowed = false;

  allowedText() {
    return this.allowed ? 'true' : 'false';
  }

  ngOnInit() {
    this.http
      .get<AllowanceResponse>(`/api/allowance`, {
        params: {currency: this.currency, limit: String(this.limit)},
      })
      .subscribe((res) => {
        this.allowed = res.allowed;
        this.cdr.markForCheck();
      });
  }
}

@Component({
  standalone: true,
  selector: 'app-a',
  template: `
  @if(ready()) {
    <app-b [currency]="currency" [limit]="limit" />
  }`,
  imports: [ComponentB],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class ComponentA implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);

  @Input({required: true}) currency!: string;

  limit = 0;
  private readyFlag = false;

  ready() {
    return this.readyFlag;
  }

  ngOnInit() {
    this.http
      .get<MoneyLimitResponse>(`/api/money-limit`, {
        params: {currency: this.currency},
      })
      .subscribe((res) => {
        this.limit = res.limit;
        this.readyFlag = true;
        this.cdr.markForCheck();
      });
  }
}

@Directive({
  standalone: true,
  selector: '[appCountriesToCurrencies]',
})
class CountriesToCurrenciesDirective implements OnInit {
  private readonly http = inject(HttpClient);

  private countries: string[] = [];
  private currencySymbols: CurrencySymbolResponse[] = [];

  @Input({required: true})
  set appCountriesToCurrencies(value: string[]) {
    this.countries = value;
  }

  constructor(private readonly vcr: ViewContainerRef) {}

  ngOnInit() {
    // First request: countries -> currency symbols.
    const joined = this.countries.join(',');
    this.http
      .get<CurrencySymbolResponse[]>(`/api/currencies`, {
        params: {countries: joined},
      })
      .subscribe((symbols) => {
        this.currencySymbols = symbols;
        this.vcr.clear();
        for (const s of this.currencySymbols) {
          // Render a fixed component type per symbol.
          this.vcr.createComponent(ComponentA, {
            injector: this.vcr.injector,
          }).setInput('currency', s.currency);
        }
      });
  }
}

@Component({
  standalone: true,
  selector: 'app-test',
  imports: [ComponentA, CountriesToCurrenciesDirective],
  template: `
    <div *appCountriesToCurrencies="countries"></div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class NestedHttpGraphComponent {
  countries: string[] = [];
  private readonly http = inject(HttpClient);

  ngOnInit() {
    this.http.get<string[]>(`/api/countries`).subscribe((countries) => {
      this.countries = countries;
    });
  }
}

describe('runTasksUntilStableAsync - nested HTTP', () => {
  let fixture: ComponentFixture<NestedHttpGraphComponent>;
  let httpTestingController: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NestedHttpGraphComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should stabilize a nested directive -> component -> component chain and render the final allowance', async () => {
    fixture = TestBed.createComponent(NestedHttpGraphComponent);
    const httpCallInstructions: HttpCallInstructionAsync[] = [
      [
        ['/api/countries', 'GET'],
        () => new Promise<HttpResponse<any>>(resolve => setTimeout(() => resolve(new HttpResponse<string[]>({body: ['FR', 'US'], status: 200})), 200)),
      ],
      [
        ['/api/currencies', 'GET'],
        () =>
          new HttpResponse<CurrencySymbolResponse[]>({
            body: [
              {currency: 'EUR', symbol: '€'},
              {currency: 'USD', symbol: '$'},
            ],
            status: 200,
          }),
      ],
      [
        ['/api/money-limit', 'GET'],
        () => new HttpResponse<MoneyLimitResponse>({body: {limit: 1000}, status: 200}),
        {sustainable: true}
      ],
      [
        ['/api/allowance', 'GET'],
        () => new HttpResponse<AllowanceResponse>({body: {allowed: true}, status: 200}),
        {sustainable: true}
      ],
    ];

    await runTasksUntilStableAsync(fixture, {httpCallInstructions});

    const el = fixture.nativeElement as HTMLElement;
    const allowed = el.querySelectorAll('.allowed');
    expect(allowed.length).toBe(2);
    expect(allowed[0]?.textContent?.trim()).toBe('Allowed: true');
    expect(allowed[1]?.textContent?.trim()).toBe('Allowed: true');
  });
});
