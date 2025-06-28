import {DebugElementHarness} from 'ngx-testbox/testing';
import {testIds} from './test-ids';
import {DebugElement} from '@angular/core';

export class HeroesHarness extends DebugElementHarness<typeof testIds> {
  constructor(debugElement: DebugElement) {
    super(debugElement, testIds);
  }

  setNameInputValue(name: string): void {
    const nameInput = this.elements.nameInput.query().nativeElement;
    nameInput.value = name;
    nameInput.dispatchEvent(new Event('input'));
    nameInput.dispatchEvent(new Event('change'));
  }
}
