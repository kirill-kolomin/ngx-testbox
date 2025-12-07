import {DebugElementHarness} from 'ngx-testbox/testing';
import {testIds} from './test-ids';
import {DebugElement} from '@angular/core';

export class HeroDetailHarness extends DebugElementHarness<typeof testIds> {
  constructor(debugElement: DebugElement, ) {
    super(debugElement, testIds);
  }

  getHeroName(): string {
    return this.elements.heroNameInput.query().nativeElement.value;
  }

  setHeroName(name: string): void {
    const input = this.elements.heroNameInput.query().nativeElement;
    input.value = name;
    input.dispatchEvent(new Event('input'));
  }

  getHeroHp(): string {
    return this.elements.heroHpInput.query().nativeElement.value;
  }

  setHeroHp(hp: number | string): void {
    const input = this.elements.heroHpInput.query().nativeElement;
    input.value = String(hp);
    input.dispatchEvent(new Event('input'));
  }

  getHeroAttack(): string {
    return this.elements.heroAttackInput.query().nativeElement.value;
  }

  setHeroAttack(attack: number | string): void {
    const input = this.elements.heroAttackInput.query().nativeElement;
    input.value = String(attack);
    input.dispatchEvent(new Event('input'));
  }

  clickGoBackButton(): void {
    this.elements.goBackButton.click();
  }

  clickSaveButton(): void {
    this.elements.saveButton.click();
  }

  getHeroId(): string {
    return this.elements.heroId.query().nativeElement.textContent.trim().replace('id: ', '');
  }

  getHeroTitle(): string {
    return this.elements.heroTitle.query().nativeElement.textContent.trim();
  }
}
