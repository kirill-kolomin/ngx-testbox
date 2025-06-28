import {ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit} from '@angular/core';

import {Hero} from '../hero';
import {HeroService} from '../hero.service';
import {NgForOf} from '@angular/common';
import {RouterLink} from '@angular/router';
import {testIdMap} from "./test-ids";
import {TestIdDirective} from 'ngx-testbox';

@Component({
  selector: 'app-heroes',
  templateUrl: './heroes.component.html',
  imports: [
    NgForOf,
    RouterLink,
    TestIdDirective
  ],
  styleUrls: ['./heroes.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeroesComponent implements OnInit {
  heroes: Hero[] = [];
  readonly testIds = testIdMap;

  constructor(private heroService: HeroService, private cdr: ChangeDetectorRef) {
  }

  ngOnInit(): void {
    this.getHeroes();
  }

  getHeroes(): void {
    this.heroService.getHeroes()
      .subscribe(heroes => {
        this.heroes = heroes;
        this.cdr.markForCheck();
      });
  }

  add(name: string): void {
    name = name.trim();
    if (!name) {
      return;
    }
    this.heroService.addHero({name} as Hero)
      .subscribe(hero => {
        this.heroes.push(hero);
        this.cdr.markForCheck();
      });
  }

  delete(hero: Hero): void {
    this.heroService.deleteHero(hero.id).subscribe(() => {
      this.heroes = this.heroes.filter(h => h !== hero);
      this.cdr.markForCheck();
    });
  }
}


/*
Copyright Google LLC. All Rights Reserved.
Use of this source code is governed by an MIT-style license that
can be found in the LICENSE file at https://angular.io/license
*/
