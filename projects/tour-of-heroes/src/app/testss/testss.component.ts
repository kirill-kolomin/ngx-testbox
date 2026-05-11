import {ChangeDetectionStrategy, ChangeDetectorRef, Component} from '@angular/core';

@Component({
  selector: 'app-testss',
  imports: [],
  templateUrl: './testss.component.html',
  styleUrl: './testss.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TestssComponent {
  heroes: any[] = [];

  constructor(private cdr:ChangeDetectorRef) {
  }
  ngOnInit() {
    this.heroes = [{name: 1, id: 2}];
    this.cdr.markForCheck();
  }
}
