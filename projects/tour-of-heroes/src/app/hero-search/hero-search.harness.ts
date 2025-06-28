import {DebugElementHarness} from 'ngx-testbox/testing';
import {testIds} from './test-ids';
import {DebugElement} from '@angular/core';

export class HeroSearchHarness extends DebugElementHarness<typeof testIds> {
  constructor(debugElement: DebugElement, ) {
    super(debugElement, testIds);
  }

  setSearchBoxValue(value: string): void {
    const searchBox = this.elements.searchBox.query().nativeElement;
    searchBox.value = value;
    searchBox.dispatchEvent(new Event('input'));
  }

  getSearchBoxValue(): string {
    return this.elements.searchBox.query().nativeElement.value;
  }

  getHeroElements(): DebugElement[] {
    return this.elements.heroItem.queryAll();
  }
}
