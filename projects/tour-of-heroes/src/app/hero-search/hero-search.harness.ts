import {DebugElementHarness} from 'ngx-testbox/testing';
import {testIds} from './test-ids';
import {DebugElement} from '@angular/core';

export class HeroSearchHarness extends DebugElementHarness<typeof testIds> {
  constructor(debugElement: DebugElement, ) {
    super(debugElement, testIds);
  }

  getSearchBoxValue(): string {
    return this.elements.searchBox.query().nativeElement.value;
  }

  getHeroElements(): DebugElement[] {
    return this.elements.heroItem.queryAll();
  }
}
