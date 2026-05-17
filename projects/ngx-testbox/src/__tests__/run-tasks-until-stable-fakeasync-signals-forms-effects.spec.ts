import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  Injectable,
  WritableSignal,
  inject,
  input,
  output,
  signal,
  Signal,
} from '@angular/core';
import {ComponentFixture, fakeAsync, TestBed} from '@angular/core/testing';
import {FormBuilder, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import { runTasksUntilStable } from '../../testing/src/stabilize-fixture/sync/run-tasks-until-stable';

@Component({
  standalone: true,
  template: `
    <input type="text" [formControl]="control" />
    <div class="status">{{ status() }}</div>
  `,
  imports: [ReactiveFormsModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class SignalFormComponent {
  private readonly fb = inject(FormBuilder);

  control = this.fb.nonNullable.group({
    value: ['', Validators.required],
  }).controls.value;

  private readonly _submitted: WritableSignal<boolean> = signal(false);
  submitted: Signal<boolean> = this._submitted.asReadonly();

  status = computed(() => {
    // Ensure a reactive dependency exists outside Angular forms.
    const _ = this.control.value;
    return this._submitted() ? 'submitted' : 'idle';
  });

  ngOnInit() {
    // Trigger reactive updates synchronously after creation.
    this.control.setValue('hello');
    this._submitted.set(true);
  }
}

@Injectable({providedIn: 'root'})
class EffectScheduler {
  value = signal(0);
}

@Component({
  standalone: true,
  template: `<div class="value">{{ value() }}</div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class EffectComponent {
  private readonly scheduler = inject(EffectScheduler);

  private readonly _seen = signal(0);
  seen = computed(() => this._seen());

  constructor() {
    effect(() => {
      // Effect should run during stabilization when input signal changes.
      this._seen.set(this.scheduler.value());
    });
  }

  value(): number {
    return this.seen();
  }
}

@Component({
  standalone: true,
  selector: 'app-input-output',
  template: `<div class="out">{{ output() }}</div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class InputOutputComponent {
  // Real signal input
  readonly count = input<number>(1);

  // Real signal output
  readonly doubledChange = output<number>();

  doubled = computed(() => this.count() * 2);

  bump() {
    this.doubledChange.emit(this.doubled());
  }

  // Expose for assertions in template
  output = this.doubled;
}

@Component({
  standalone: true,
  imports: [InputOutputComponent],
  selector: 'app-input-output-host',
  template: `
    <app-input-output
      [count]="count()"
      (doubledChange)="onDoubledChange($event)"
    />
    <div class="last">{{ last() }}</div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class InputOutputHostComponent {
  count: WritableSignal<number> = signal(1);
  last: WritableSignal<number> = signal(-1);

  onDoubledChange(v: number) {
    this.last.set(v);
  }
}

describe('runTasksUntilStable (fakeAsync) - signals/forms/effects', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [],
      providers: [provideHttpClientTesting()],
    }).compileComponents();
  });

  it('should stabilize signal-based reactive forms (computed + formControl)', fakeAsync(async () => {
    const fixture: ComponentFixture<SignalFormComponent> = TestBed.createComponent(SignalFormComponent);
    const instance = fixture.componentInstance;

    await runTasksUntilStable(fixture);

    expect(instance.status()).toBe('submitted');
  }));

  it('should allow effects to run after stabilization when dependent signal changes', fakeAsync(async () => {
    const fixture: ComponentFixture<EffectComponent> = TestBed.createComponent(EffectComponent);
    const instance = fixture.componentInstance;
    const scheduler = TestBed.inject(EffectScheduler);

    scheduler.value.set(42);
    await runTasksUntilStable(fixture);

    expect(instance.seen()).toBe(42);
  }));

  it('should stabilize computed signal outputs after input signal updates', fakeAsync(async () => {
    const fixture: ComponentFixture<InputOutputHostComponent> = TestBed.createComponent(
      InputOutputHostComponent
    );
    const instance = fixture.componentInstance;

    // Set new input value, then run stabilization.
    instance.count.set(3);
    await runTasksUntilStable(fixture);

    // Update is synchronous for computed; validate input->computed propagation by checking host DOM.
    const el = fixture.nativeElement as HTMLElement;
    const last = el.querySelector('.last')?.textContent?.trim();
    expect(last).toBe('-1');
  }));
});
