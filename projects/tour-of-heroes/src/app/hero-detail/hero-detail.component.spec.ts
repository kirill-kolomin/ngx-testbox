import {ComponentFixture, fakeAsync, TestBed} from '@angular/core/testing';
import {HeroDetailComponent} from './hero-detail.component';
import {HeroDetailHarness} from './hero-detail.harness';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {HEROES_URL} from '../hero.service';
import {HEROES} from '../mock-heroes';
import {ActivatedRoute, convertToParamMap, provideRouter} from '@angular/router';
import {Location} from '@angular/common';
import {HttpCallInstruction, predefinedHttpCallInstructions, runTasksUntilStable} from 'ngx-testbox/testing';

const heroId = 12; // ID of the hero to test with
const testHero = HEROES.find(h => h.id === heroId)!;

const getHeroSuccessHttpCallInstruction = () =>
  predefinedHttpCallInstructions.get.success(`${HEROES_URL}/${heroId}`, () => testHero);

const getHeroErrorHttpCallInstruction = () =>
  predefinedHttpCallInstructions.get.error(`${HEROES_URL}/${heroId}`);

const updateHeroSuccessHttpCallInstruction = () =>
  predefinedHttpCallInstructions.put.success(HEROES_URL);

const updateHeroErrorHttpCallInstruction = () =>
  predefinedHttpCallInstructions.put.error(HEROES_URL);

const defaultHttpCallInstructions = [getHeroSuccessHttpCallInstruction()];

describe('HeroDetailComponent', () => {
  let fixture: ComponentFixture<HeroDetailComponent>;
  let harness: HeroDetailHarness;
  let locationSpy: jasmine.SpyObj<Location>;

  beforeEach(async () => {
    locationSpy = jasmine.createSpyObj('Location', ['back']);

    await TestBed.configureTestingModule({
      imports: [HeroDetailComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({
                id: heroId.toString()
              })
            }
          }
        },
        {provide: Location, useValue: locationSpy}
      ]
    }).compileComponents();
  });

  it('should display hero details when hero is loaded', fakeAsync(async () => {
    initComponent();

    expect(harness.getHeroId()).toBe(testHero.id.toString());
    expect(harness.getHeroName()).toBe(testHero.name);
    expect(harness.getHeroTitle()).toBe(testHero.name.toUpperCase() + ' Details');
  }));

  it('should not display hero details when hero fails to load', fakeAsync(async () => {
    initComponent([getHeroErrorHttpCallInstruction()]);

    // The hero detail container should not be present
    expect(harness.elements.heroDetail.queryAll().length).toBe(0);
  }));

  it('should allow editing the hero name', fakeAsync(async () => {
    initComponent();

    const newName = 'Updated Hero Name';
    harness.setHeroName(newName);

    expect(harness.getHeroName()).toBe(newName);
  }));

  it('should save hero and navigate back when save button is clicked', fakeAsync(async () => {
    initComponent();

    const newName = 'Updated Hero Name';
    harness.setHeroName(newName);

    harness.clickSaveButton();

    runTasksUntilStable(fixture, {
      httpCallInstructions: [updateHeroSuccessHttpCallInstruction()],
    });

    expect(locationSpy.back).toHaveBeenCalled();
  }));

  it('should not navigate back when save fails', fakeAsync(async () => {
    initComponent();

    const newName = 'Updated Hero Name';
    harness.setHeroName(newName);

    harness.clickSaveButton();

    runTasksUntilStable(fixture, {
      httpCallInstructions: [updateHeroErrorHttpCallInstruction()],
    });

    expect(locationSpy.back).not.toHaveBeenCalled();
  }));

  it('should navigate back when go back button is clicked', fakeAsync(async () => {
    initComponent();

    harness.clickGoBackButton();

    expect(locationSpy.back).toHaveBeenCalled();
  }));

  function initComponent(httpCallInstructions: HttpCallInstruction[] = defaultHttpCallInstructions) {
    fixture = TestBed.createComponent(HeroDetailComponent);
    harness = new HeroDetailHarness(fixture.debugElement);

    runTasksUntilStable(fixture, {
      httpCallInstructions,
    });
  }
});
