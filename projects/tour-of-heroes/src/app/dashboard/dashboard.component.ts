import {ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit} from '@angular/core';
import { Hero } from '../hero';
import { HeroService } from '../hero.service';
import {NgForOf} from '@angular/common';
import {RouterLink} from '@angular/router';
import {HeroSearchComponent} from '../hero-search/hero-search.component';
import {TestIdDirective} from 'ngx-testbox';
import {testIdMap} from './test-ids';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  imports: [
    NgForOf,
    RouterLink,
    HeroSearchComponent,
    TestIdDirective
  ],
  styleUrls: ['./dashboard.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit {
  heroes: Hero[] = [];
  readonly testIds = testIdMap;

  constructor(private heroService: HeroService, private cdr: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.getHeroes();
  }

  getHeroes(): void {
    this.heroService.getHeroes()
      .subscribe(heroes => {
        this.heroes = heroes.slice(1, 5);
        this.cdr.markForCheck();
      });
  }
}


/*
Copyright Google LLC. All Rights Reserved.
Use of this source code is governed by an MIT-style license that
can be found in the LICENSE file at https://angular.io/license
*/
