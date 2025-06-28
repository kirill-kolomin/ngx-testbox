import {ComponentFixture, fakeAsync, TestBed} from '@angular/core/testing';
import {DashboardComponent} from './dashboard.component';
import {DashboardHarness} from './dashboard.harness';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {predefinedHttpCallInstructions, runTasksUntilStable, HttpCallInstruction} from 'ngx-testbox/testing';
import {HEROES_URL} from '../hero.service';
import {HEROES} from '../mock-heroes';
import {provideRouter} from '@angular/router';

const getHeroesSuccessHttpCallInstruction = (amount: number) =>
  predefinedHttpCallInstructions.get.success(HEROES_URL, () => HEROES.slice(0, amount));
const getHeroesFailHttpCallInstruction = () =>
  predefinedHttpCallInstructions.get.error(HEROES_URL);

const defaultHttpCallInstructions = [getHeroesSuccessHttpCallInstruction(0)];

describe('DashboardComponent', () => {
  let fixture: ComponentFixture<DashboardComponent>;
  let harness: DashboardHarness;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    }).compileComponents();
  })

  it('should display "Top Heroes" in the title', fakeAsync(async () => {
    initComponent();
    expect(harness.elements.title.getTextContent()).toBe('Top Heroes');
  }));

  describe('heroes menu', () => {
    it('should show heroes when server responds with heroes', fakeAsync(async () => {
      initComponent([getHeroesSuccessHttpCallInstruction(5)]);

      expect(harness.elements.heroLink.queryAll().length).toBe(4);
    }))

    it('should not show any heroes if server responds with error', fakeAsync(async () => {
      initComponent([getHeroesFailHttpCallInstruction()]);
      expect(harness.elements.heroLink.queryAll().length).toBe(0);
    }))

    it('should display hero name for each hero', fakeAsync(() => {
      initComponent([getHeroesSuccessHttpCallInstruction(5)]);

      const heroLinks = harness.elements.heroLink.queryAll();
      for(let i = 0; i < heroLinks.length; i++) {
        expect(heroLinks[i].nativeElement.textContent.trim()).toBe(HEROES[i + 1].name);
      }
    }));

    it('should create correct detail link for each hero', fakeAsync(() => {
      initComponent([getHeroesSuccessHttpCallInstruction(5)]);

      const heroLinks = harness.elements.heroLink.queryAll();
      for(let i = 0; i < heroLinks.length; i++) {
        expect(heroLinks[i].attributes['href']).toBe(`/detail/${HEROES[i + 1].id}`);
      }
    }));
  })

  function initComponent(httpCallInstructions: HttpCallInstruction[] = defaultHttpCallInstructions) {
    fixture = TestBed.createComponent(DashboardComponent);
    harness = new DashboardHarness(fixture.debugElement);

    runTasksUntilStable(fixture, {
      httpCallInstructions,
    })
  }
})
