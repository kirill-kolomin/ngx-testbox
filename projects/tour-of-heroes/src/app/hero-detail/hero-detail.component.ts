import {ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {Location, UpperCasePipe} from '@angular/common';

import { Hero } from '../hero';
import { HeroService } from '../hero.service';
import {FormsModule} from '@angular/forms';
import {TestIdDirective} from 'ngx-testbox';
import {testIdMap} from './test-ids';

@Component({
  selector: 'app-hero-detail',
  templateUrl: './hero-detail.component.html',
  imports: [
    UpperCasePipe,
    FormsModule,
    TestIdDirective
  ],
  styleUrls: ['./hero-detail.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeroDetailComponent implements OnInit {
  hero: Hero | undefined;
  readonly testIds = testIdMap;

  constructor(
    private route: ActivatedRoute,
    private heroService: HeroService,
    private location: Location,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.getHero();
  }

  getHero(): void {
    const id = parseInt(this.route.snapshot.paramMap.get('id')!, 10);
    this.heroService.getHero(id)
      .subscribe(hero => {
        this.hero = hero;
        this.cdr.markForCheck();
      });
  }

  goBack(): void {
    this.location.back();
  }

  save(): void {
    if (this.hero) {
      this.heroService.updateHero(this.hero)
        .subscribe(() => this.goBack());
    }
  }
}


/*
Copyright Google LLC. All Rights Reserved.
Use of this source code is governed by an MIT-style license that
can be found in the LICENSE file at https://angular.io/license
*/
