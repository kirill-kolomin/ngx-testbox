import {DebugElementHarness} from 'ngx-testbox/testing';
import {testIds} from './test-ids';
import {DebugElement} from '@angular/core';

export class DashboardHarness extends DebugElementHarness<typeof testIds> {
  constructor(debugElement: DebugElement) {
    super(debugElement, testIds);
  }
}
