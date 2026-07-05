import {ComponentFixture, TestBed} from '@angular/core/testing';
import {HeroSearchComponent} from '../hero-search.component';
import {HeroSearchHarness} from '../hero-search.harness';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {
  HttpCallInstructionAsync,
  predefinedHttpCallInstructionsAsync,
  runTasksUntilStableAsync,
} from 'ngx-testbox/testing';
import {HEROES_URL} from '../../hero.service';
import {HEROES} from '../../mock-heroes';
import {provideRouter} from '@angular/router';

jasmine.DEFAULT_TIMEOUT_INTERVAL = 60_000;
const getHeroesSearchSuccessHttpCallInstruction = (term: string) =>
  predefinedHttpCallInstructionsAsync.get.success(`${HEROES_URL}/?name=${term}`, (httpRequest, urlSearchParams) => {
    const term = urlSearchParams.get('name')!;
    return HEROES.filter(hero => hero.name.toLowerCase().includes(term.toLowerCase()))
  });

const getHeroesSearchEmptyHttpCallInstruction = (term: string) =>
  predefinedHttpCallInstructionsAsync.get.success(`${HEROES_URL}/?name=${term}`, () => []);

const getHeroesSearchErrorHttpCallInstruction = (term: string) =>
  predefinedHttpCallInstructionsAsync.get.error(`${HEROES_URL}/?name=${term}`);

const defaultHttpCallInstructions: HttpCallInstructionAsync[] = [];

describe('HeroSearchComponent', () => {
  let fixture: ComponentFixture<HeroSearchComponent>;
  let harness: HeroSearchHarness;

  beforeEach(async () => {

    await TestBed.configureTestingModule({
      imports: [HeroSearchComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ]
    }).compileComponents();
  })

  it('should have empty search box initially', async () => {
    await initComponent();
    expect(harness.getSearchBoxValue()).toBe('');
  });

  it('should have no search results initially', async () => {
    await initComponent();
    expect(harness.getHeroElements().length).toBe(0);
  });

  describe('search functionality', () => {
    it('should show heroes when search term matches hero names', async () => {
      const searchTerm = 'ma'; // Should match heroes with 'ma' in their name
      await initComponent();

      harness.elements.searchBox.inputValue(searchTerm);
      await runTasksUntilStableAsync(fixture, {
        httpCallInstructions: [
          getHeroesSearchSuccessHttpCallInstruction(searchTerm)
        ],
      });

      const heroElements = harness.getHeroElements();
      expect(heroElements.length).toBeGreaterThan(0);

      // Verify each result contains the search term
      heroElements.forEach(heroElement => {
        const heroName = harness.elements.heroLink.query(heroElement).nativeElement.textContent.trim();
        expect(heroName.toLowerCase()).toContain(searchTerm.toLowerCase());
      });
    });

    it('should show no heroes when search term is an empty string or string of spaces', async () => {
      const searchTerm = '     ';
      await initComponent();

      harness.elements.searchBox.inputValue(searchTerm);
      await runTasksUntilStableAsync(fixture, {httpCallInstructions: []});

      const results = harness.getHeroElements();
      expect(results.length).toBe(0);
    });

    it('should not show any heroes if search term does not match any hero names', async () => {
      const searchTerm = 'xyz'; // Should not match any hero names
      await initComponent();

      harness.elements.searchBox.inputValue(searchTerm);
      await runTasksUntilStableAsync(fixture, {
        httpCallInstructions: [
          getHeroesSearchEmptyHttpCallInstruction(searchTerm)
        ],
      });

      expect(harness.getHeroElements().length).toBe(0);
    });

    it('should not show any heroes if search returns an error', async () => {
      const searchTerm = 'error'; // Will trigger an error response
      await initComponent();

      harness.elements.searchBox.inputValue(searchTerm);
      await runTasksUntilStableAsync(fixture, {
        httpCallInstructions: [
          getHeroesSearchErrorHttpCallInstruction(searchTerm)
        ],
      });

      expect(harness.getHeroElements().length).toBe(0);
    });

    it('should create correct detail link for each hero in search results', async () => {
      const searchTerm = 'ma'; // Should match heroes with 'ma' in their name
      await initComponent();

      harness.elements.searchBox.inputValue(searchTerm);
      await runTasksUntilStableAsync(fixture, {
        httpCallInstructions: [
          getHeroesSearchSuccessHttpCallInstruction(searchTerm)
        ]
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
    });
  });

  async function initComponent(httpCallInstructions: HttpCallInstructionAsync[] = defaultHttpCallInstructions) {
    fixture = TestBed.createComponent(HeroSearchComponent);
    harness = new HeroSearchHarness(fixture.debugElement);

    await runTasksUntilStableAsync(fixture, {
      httpCallInstructions,
    })
  }
});
