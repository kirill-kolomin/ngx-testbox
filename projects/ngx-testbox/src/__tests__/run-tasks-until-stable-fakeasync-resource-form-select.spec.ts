import {Component, Injectable, inject} from '@angular/core';
import {ComponentFixture, fakeAsync, TestBed} from '@angular/core/testing';
import {FormsModule, ReactiveFormsModule, FormBuilder, Validators} from '@angular/forms';
import {HttpClient, provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {HttpResponse} from '@angular/common/http';
import {DebugElementHarness} from '../../testing/src/debug-element-harness';
import {TestIdDirective} from '../lib/directives/test-id.directive';
import {firstValueFrom} from 'rxjs';
import { HttpCallInstruction } from '../../testing/src/interfaces/http-call';
import { runTasksUntilStable } from '../../testing/src/stabilize-fixture/sync/run-tasks-until-stable';

type Country = {code: string; name: string};

const testIds = ['countrySelect', 'submitButton', 'successMessage', 'countryOption'] as const;
const testIdMap = TestIdDirective.idsToMap(testIds);

@Injectable({providedIn: 'root'})
class CountriesApi {
  constructor(private http: HttpClient) {}

  getCountries() {
    return this.http.get<Country[]>('/api/countries');
  }

  submit(payload: {countryCode: string}) {
    return this.http.post<{success: boolean}>('/api/submit', payload);
  }
}

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, TestIdDirective],
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()">
      <label>
        <select formControlName="country" [testboxTestId]="testIdMap.countrySelect">
          <option [ngValue]="null">-- choose --</option>
          @for (country of countries; track country.code) {
            <option [testboxTestId]="testIdMap.countryOption" [value]="country.code">{{ country.name }}</option>
          }
        </select>
      </label>

      <button type="submit" [testboxTestId]="testIdMap.submitButton">Submit</button>

      <div class="message" [testboxTestId]="testIdMap.successMessage">{{ message }}</div>
    </form>
  `
})
class ResourceSelectFormComponent {
  private fb = inject(FormBuilder);
  private api = inject(CountriesApi);

  countries: Country[] = [];
  message = '';

  testIdMap = testIdMap;

  form = this.fb.group({
    country: [null as string | null, Validators.required],
  });

  async ngOnInit() {
    const countries = await firstValueFrom(this.api.getCountries());
    this.countries = countries;
  }

  onSubmit() {
    if (this.form.invalid) {
      return;
    }

    const countryCode = this.form.value.country!;
    this.api.submit({countryCode}).subscribe((res) => {
      if (res?.success) {
        this.message = 'submitted successfully';
      }
    });
  }
}

describe('runTasksUntilStable (fakeAsync) - resource + form', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResourceSelectFormComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  })

  it('should load countries, render select options, submit, and show success message', fakeAsync(() => {
    const fixture: ComponentFixture<ResourceSelectFormComponent> = TestBed.createComponent(
      ResourceSelectFormComponent
    );
    const harness = new DebugElementHarness(fixture.debugElement, testIds);

    const httpCallInstructions: HttpCallInstruction[] = [
      [
        ['/api/countries', 'GET'],
        () => new HttpResponse({body: [{code: 'GB', name: 'United Kingdom'}, {code: 'DE', name: 'Germany'}]}),
      ],
    ];

    runTasksUntilStable(fixture, {httpCallInstructions});

    const optionEls = harness.elements.countryOption.queryAll();

    expect(optionEls.length).toBe(2);
    expect(optionEls[0].nativeElement.textContent).toBe('United Kingdom')
    expect(optionEls[1].nativeElement.textContent).toBe('Germany')

    harness.elements.countrySelect.changeValue('DE');
    harness.elements.submitButton.click();

    const submitInstructions: HttpCallInstruction[] = [
      [['/api/submit', 'POST'], () => new HttpResponse({body: {success: true}})],
    ];

    runTasksUntilStable(fixture, {httpCallInstructions: submitInstructions});

    expect(harness.elements.successMessage.getTextContent().trim()).toBe('submitted successfully');
  }));
});
