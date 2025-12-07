import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output} from '@angular/core';
import {Hero} from '../../hero';
import {RouterLink} from '@angular/router';
import {TestIdDirective} from 'ngx-testbox';
import {testIdMap as heroesTestIds} from '../test-ids';

@Component({
  selector: 'app-hero-card',
  standalone: true,
  imports: [RouterLink, TestIdDirective],
  templateUrl: './hero-card.component.html',
  styleUrls: ['./hero-card.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeroCardComponent {
  @Input() hero!: Hero;
  @Output() delete = new EventEmitter<Hero>();

  readonly testIds = heroesTestIds;

  onDelete() {
    this.delete.emit(this.hero);
  }
}
