import {Component, Injectable} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {FormsModule, ReactiveFormsModule, FormBuilder, Validators} from '@angular/forms';
import {HttpClient, provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {HttpResponse} from '@angular/common/http';
import {DebugElementHarness} from '../../../testing/src/debug-element-harness';
import {TestIdDirective} from '../../../src/lib/directives/test-id.directive';
import {inject} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { By } from '@angular/platform-browser';
import { HttpCallInstructionAsync } from '../../../testing/src/interfaces/http-call';
import { runTasksUntilStableAsync } from '../../../testing/src/run-tasks-until-stable-async';

type Country = {code: string; name: string};

const testIds = [
  'countrySelect',
  'submitButton',
  'successMessage',
] as const;

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
            <option [value]="country.code">{{ country.name }}</option>
          }
        </select>
      </label>

      <button type="submit" [testboxTestId]="testIdMap.submitButton">Submit</button>

      <div class="message" [testboxTestId]="testIdMap.successMessage">{{ message }}</div>
    </form>
  `,
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

describe('runTasksUntilStableAsync - resource + form', () => {
  it('should load countries, render select options, submit, and show success message', async () => {
    await TestBed.configureTestingModule({
      imports: [ResourceSelectFormComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    const fixture = TestBed.createComponent(ResourceSelectFormComponent);
    const harness = new DebugElementHarness(fixture.debugElement, testIds);

    const httpCallInstructions: HttpCallInstructionAsync[] = [
      [['/api/countries', 'GET'], () => new HttpResponse({body: [{code: 'GB', name: 'United Kingdom'}, {code: 'DE', name: 'Germany'}]})],
    ];

    await runTasksUntilStableAsync(fixture, {httpCallInstructions});


    // Assert options are present in the select.
    const selectDebugEl = harness.elements.countrySelect.query();
    const optionEls = selectDebugEl.queryAll(By.css('option'));

    // includes the placeholder + loaded options
    expect(optionEls.length).toBeGreaterThan(1);
    expect(optionEls.map(o => (o.nativeElement as HTMLOptionElement).value)).toContain('DE');

    // Select Germany and submit.
    (selectDebugEl.nativeElement as HTMLSelectElement).value = 'DE';
    selectDebugEl.nativeElement.dispatchEvent(new Event('change'));
    fixture.detectChanges(); 

    harness.elements.submitButton.click();

    const submitInstructions: HttpCallInstructionAsync[] = [
      [['/api/submit', 'POST'], () => new HttpResponse({body: {success: true}})],
    ];

    await runTasksUntilStableAsync(fixture, {httpCallInstructions: submitInstructions});

    expect(harness.elements.successMessage.getTextContent().trim()).toBe('submitted successfully');
  });
});
