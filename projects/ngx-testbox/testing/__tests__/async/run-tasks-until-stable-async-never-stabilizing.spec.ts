import {ChangeDetectionStrategy, Component, NgZone, OnInit} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {runTasksUntilStableAsync} from '../../../testing/src/run-tasks-until-stable-async';
import {LongRunningComponentError} from '../../../testing/src/errors/LongRunningComponentError';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

jasmine.DEFAULT_TIMEOUT_INTERVAL = 60_000;

@Component({
  template: '<div>Never stabilizing</div>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class NeverStabilizingComponent implements OnInit {
  ngOnInit() {
    // Perpetual timer inside Angular zone keeps the fixture from stabilizing.
    setInterval(() => {
      // no-op
    }, 10);
  }
}

describe('runTasksUntilStableAsync - never-stabilizing detection', () => {
  let fixture: ComponentFixture<NeverStabilizingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NeverStabilizingComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();
  });

  it('rejects with long running component error', async () => {
    fixture = TestBed.createComponent(NeverStabilizingComponent);
    let err: any;

    await runTasksUntilStableAsync(fixture, {
      componentLongRunTimeout: 300,
    }).then(
      () => {},
      (error) => {
        err = error;
      }
    );

    expect(err instanceof LongRunningComponentError).toBeTrue();
  });
});
