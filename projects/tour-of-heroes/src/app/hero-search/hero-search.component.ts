import {ChangeDetectionStrategy, Component, OnInit, PendingTasks} from '@angular/core';

import { Observable, Subject } from 'rxjs';

import {
   debounceTime, distinctUntilChanged, switchMap,
   tap
 } from 'rxjs/operators';

import { Hero } from '../hero';
import { HeroService } from '../hero.service';
import {AsyncPipe} from '@angular/common';
import {RouterLink} from '@angular/router';
import {TestIdDirective} from 'ngx-testbox';
import {testIdMap} from './test-ids';

@Component({
  selector: 'app-hero-search',
  templateUrl: './hero-search.component.html',
  imports: [
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

  constructor(private heroService: HeroService, private pendingTasks: PendingTasks) {}

  // Push a search term into the observable stream.
  search(term: string): void {
    this.searchTerms.next(term);
  }

  ngOnInit(): void {
    let taskCleanup = () => {};
    this.heroes$ = this.searchTerms.pipe(
      tap(() => {
        taskCleanup();
        taskCleanup = this.pendingTasks.add();
      }),
      debounceTime(300),
      distinctUntilChanged(),
      tap(() => {
        taskCleanup();
      }),
      switchMap((term: string) => this.heroService.searchHeroes(term)),
    );
  }
}


/*
Copyright Google LLC. All Rights Reserved.
Use of this source code is governed by an MIT-style license that
can be found in the LICENSE file at https://angular.io/license
*/
