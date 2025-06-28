import {ComponentFixture, fakeAsync, TestBed} from '@angular/core/testing';
import {HeroSearchComponent} from './hero-search.component';
import {HeroSearchHarness} from './hero-search.harness';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {
  HttpCallInstruction,
  predefinedHttpCallInstructions,
  runTasksUntilStable,
} from 'ngx-testbox/testing';
import {HEROES_URL} from '../hero.service';
import {HEROES} from '../mock-heroes';
import {provideRouter} from '@angular/router';

const getHeroesSearchSuccessHttpCallInstruction = () =>
  predefinedHttpCallInstructions.get.success(new RegExp(`${HEROES_URL}/\\?name=\\w+`), (httpRequest, urlSearchParams) => {
    const term = urlSearchParams.get('name')!;
    return HEROES.filter(hero => hero.name.toLowerCase().includes(term.toLowerCase()))
  });

const getHeroesSearchEmptyHttpCallInstruction = (term: string) =>
  predefinedHttpCallInstructions.get.success(`${HEROES_URL}/?name=${term}`, () => []);

const getHeroesSearchErrorHttpCallInstruction = (term: string) =>
  predefinedHttpCallInstructions.get.error(`${HEROES_URL}/?name=${term}`);

const defaultHttpCallInstructions: HttpCallInstruction[] = [];

describe('HeroSearchComponent', () => {
  let fixture: ComponentFixture<HeroSearchComponent>;
  let harness: HeroSearchHarness;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeroSearchComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    }).compileComponents();
  })

  it('should have empty search box initially', fakeAsync(async () => {
    initComponent();
    expect(harness.getSearchBoxValue()).toBe('');
  }));

  it('should have no search results initially', fakeAsync(async () => {
    initComponent();
    expect(harness.getHeroElements().length).toBe(0);
  }));

  describe('search functionality', () => {
    it('should show heroes when search term matches hero names', fakeAsync(async () => {
      const searchTerm = 'ma'; // Should match heroes with 'ma' in their name
      initComponent();

      harness.setSearchBoxValue(searchTerm);
      runTasksUntilStable(fixture, {
        httpCallInstructions: [
          getHeroesSearchSuccessHttpCallInstruction()
        ],
      });

      const heroElements = harness.getHeroElements();
      expect(heroElements.length).toBeGreaterThan(0);

      // Verify each result contains the search term
      heroElements.forEach(heroElement => {
        const heroName = harness.elements.heroLink.query(heroElement).nativeElement.textContent.trim();
        expect(heroName.toLowerCase()).toContain(searchTerm.toLowerCase());
      });
    }));

    it('should show no heroes when search term is an empty string or string of spaces', fakeAsync(async () => {
      const searchTerm = '     ';
      initComponent();

      harness.setSearchBoxValue(searchTerm);
      runTasksUntilStable(fixture);

      const results = harness.getHeroElements();
      expect(results.length).toBe(0);
    }));

    it('should not show any heroes if search term does not match any hero names', fakeAsync(async () => {
      const searchTerm = 'xyz'; // Should not match any hero names
      initComponent();

      harness.setSearchBoxValue(searchTerm);
      runTasksUntilStable(fixture, {
        httpCallInstructions: [
          getHeroesSearchEmptyHttpCallInstruction(searchTerm)
        ],
      });

      expect(harness.getHeroElements().length).toBe(0);
    }));

    it('should not show any heroes if search returns an error', fakeAsync(async () => {
      const searchTerm = 'error'; // Will trigger an error response
      initComponent();

      harness.setSearchBoxValue(searchTerm);
      runTasksUntilStable(fixture, {
        httpCallInstructions: [
          getHeroesSearchErrorHttpCallInstruction(searchTerm)
        ],
      });

      expect(harness.getHeroElements().length).toBe(0);
    }));

    it('should create correct detail link for each hero in search results', fakeAsync(() => {
      const searchTerm = 'ma'; // Should match heroes with 'ma' in their name
      initComponent();

      harness.setSearchBoxValue(searchTerm);
      runTasksUntilStable(fixture, {
        httpCallInstructions: [
          getHeroesSearchSuccessHttpCallInstruction()
        ],
      });

      const results = harness.getHeroElements();

      // Get the matching heroes from the mock data
      const matchingHeroes = HEROES.filter(hero =>
        hero.name.toLowerCase().includes(searchTerm.toLowerCase())
      );

      // Verify each result has the correct detail link
      for (let i = 0; i < results.length; i++) {
        const heroLink = harness.elements.heroLink.query(results[i]);
        expect(heroLink.attributes['href']).toBe(`/detail/${matchingHeroes[i].id}`);
      }
    }));
  });

  function initComponent(httpCallInstructions: HttpCallInstruction[] = defaultHttpCallInstructions) {
    fixture = TestBed.createComponent(HeroSearchComponent);
    harness = new HeroSearchHarness(fixture.debugElement);

    runTasksUntilStable(fixture, {
      httpCallInstructions,
    })
  }
});
