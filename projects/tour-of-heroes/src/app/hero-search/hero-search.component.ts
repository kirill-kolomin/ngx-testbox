import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';

import { Observable, Subject } from 'rxjs';

import {
   debounceTime, distinctUntilChanged, switchMap
 } from 'rxjs/operators';

import { Hero } from '../hero';
import { HeroService } from '../hero.service';
import {AsyncPipe, NgForOf} from '@angular/common';
import {RouterLink} from '@angular/router';
import {TestIdDirective} from 'ngx-testbox';
import {testIdMap} from './test-ids';

@Component({
  selector: 'app-hero-search',
  templateUrl: './hero-search.component.html',
  imports: [
    NgForOf,
    RouterLink,
    AsyncPipe,
    TestIdDirective
  ],
  styleUrls: ['./hero-search.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeroSearchComponent implements OnInit {
  heroes$!: Observable<Hero[]>;
  private searchTerms = new Subject<string>();
  readonly testIds = testIdMap;

  constructor(private heroService: HeroService) {}

  // Push a search term into the observable stream.
  search(term: string): void {
    this.searchTerms.next(term);
  }

  ngOnInit(): void {
    this.heroes$ = this.searchTerms.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((term: string) => this.heroService.searchHeroes(term)),
    );
  }
}


/*
Copyright Google LLC. All Rights Reserved.
Use of this source code is governed by an MIT-style license that
can be found in the LICENSE file at https://angular.io/license
*/
