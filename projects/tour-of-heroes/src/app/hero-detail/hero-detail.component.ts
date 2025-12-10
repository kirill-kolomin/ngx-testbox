import {ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {Location, UpperCasePipe} from '@angular/common';

import { Hero } from '../hero';
import { HeroService } from '../hero.service';
import {ReactiveFormsModule, FormBuilder, FormGroup} from '@angular/forms';
import {TestIdDirective} from 'ngx-testbox';
import {testIdMap} from './test-ids';

@Component({
  selector: 'app-hero-detail',
  templateUrl: './hero-detail.component.html',
  imports: [
    UpperCasePipe,
    ReactiveFormsModule,
    TestIdDirective
  ],
  styleUrls: ['./hero-detail.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeroDetailComponent implements OnInit {
  hero: Hero | undefined;
  readonly testIds = testIdMap;
  form: FormGroup;

  constructor(
    private route: ActivatedRoute,
    private heroService: HeroService,
    private location: Location,
    private cdr: ChangeDetectorRef,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      name: [''],
      hp: [null],
      attack: [null]
    });
  }

  ngOnInit(): void {
    this.getHero();
  }

  getHero(): void {
    const id = parseInt(this.route.snapshot.paramMap.get('id')!, 10);
    this.heroService.getHero(id)
      .subscribe(hero => {
        this.hero = hero;
        // Patch form values with the loaded hero
        this.form.patchValue({
          name: hero.name,
          hp: hero.hp,
          attack: hero.attack
        });
        this.cdr.markForCheck();
      });
  }

  goBack(): void {
    this.location.back();
  }

  save(): void {
    if (this.hero) {
      const updated: Hero = {
        ...this.hero,
        ...this.form.value
      } as Hero;
      this.heroService.updateHero(updated)
        .subscribe(() => this.goBack());
    }
  }
}


/*
Copyright Google LLC. All Rights Reserved.
Use of this source code is governed by an MIT-style license that
can be found in the LICENSE file at https://angular.io/license
*/
