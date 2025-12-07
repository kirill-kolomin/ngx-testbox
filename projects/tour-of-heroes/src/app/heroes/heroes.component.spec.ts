import {ComponentFixture, fakeAsync, TestBed} from '@angular/core/testing';
import {HeroesComponent} from './heroes.component';
import {HeroesHarness} from './heroes.harness';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {HttpCallInstruction, predefinedHttpCallInstructions, runTasksUntilStable,} from 'ngx-testbox/testing';
import {HEROES_URL} from '../hero.service';
import {HEROES} from '../mock-heroes';
import {provideRouter} from '@angular/router';

const getHeroesSuccessHttpCallInstruction = (amount: number) =>
  predefinedHttpCallInstructions.get.success(HEROES_URL, () => HEROES.slice(0, amount));
const getHeroesFailHttpCallInstruction = () =>
  predefinedHttpCallInstructions.get.error(HEROES_URL);
const getPostHeroesSuccessHttpCallInstruction = () =>
  predefinedHttpCallInstructions.post.success(HEROES_URL, (httpRequest) => ({
    name: (httpRequest.body as any).name,
    id: Math.floor(Math.random() * 1000000),
    hp: 100,
    attack: 10,
  }));
const getPostHeroesFailHttpCallInstruction = () => predefinedHttpCallInstructions.post.error(HEROES_URL);
const getDeleteHeroSuccessHttpCallInstruction = () => predefinedHttpCallInstructions.delete.success(HEROES_URL);
const getDeleteHeroFailHttpCallInstruction = () => predefinedHttpCallInstructions.delete.error(HEROES_URL);

const defaultHttpCallInstructions = [getHeroesSuccessHttpCallInstruction(0)];

describe('HeroesComponent', () => {
  let fixture: ComponentFixture<HeroesComponent>;
  let harness: HeroesHarness;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeroesComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    }).compileComponents();
  })

  it('should display "My Heroes" in the title', fakeAsync(async () => {
    initComponent();
    expect(harness.elements.title.getTextContent()).toBe('My Heroes');
  }));

  describe('heroes list', () => {
    it('should show all heroes when server responds with heroes', fakeAsync(async () => {
      const heroesLength = HEROES.length;

      initComponent([getHeroesSuccessHttpCallInstruction(heroesLength),]);
      expect(harness.elements.heroItem.queryAll().length).toBe(heroesLength);
    }))

    it('should not show any heroes if server responds with error', fakeAsync(async () => {
      initComponent([getHeroesFailHttpCallInstruction()]);
      expect(harness.elements.heroItem.queryAll().length).toBe(0);
    }))

    it('should display hero id and name for each hero', fakeAsync(() => {
      const heroesLength = HEROES.length;

      initComponent([getHeroesSuccessHttpCallInstruction(heroesLength),]);

      const heroes = harness.elements.heroItem.queryAll();

      for (let i = 0; i < heroes.length; i++) {
        expect(harness.elements.heroName.query(heroes[i]).nativeElement.textContent.trim()).toBe(HEROES[i].name)
        expect(harness.elements.heroId.query(heroes[i]).nativeElement.textContent.trim()).toBe(HEROES[i].id.toString())
      }
    }));

    it('should create correct detail link for each hero', fakeAsync(() => {
      const heroesLength = HEROES.length;

      initComponent([getHeroesSuccessHttpCallInstruction(heroesLength),]);

      const heroes = harness.elements.heroItem.queryAll();

      for (let i = 0; i < heroes.length; i++) {
        expect(harness.elements.heroLink.query(heroes[i]).attributes['href']).toBe(`/detail/${HEROES[i].id}`)
      }
    }));
  })

  describe('add hero', () => {
    it('should add new hero when valid name is entered', fakeAsync(async () => {
      initComponent();

      expect(harness.elements.heroItem.queryAll().length).toBe(0);

      const name = `Test Hero`;

      for (let i = 1; i <= 10; i++) {
        harness.setNameInputValue(`${name} ${i}`);
        harness.elements.addButton.click();

        runTasksUntilStable(fixture, {
          httpCallInstructions: [
            getPostHeroesSuccessHttpCallInstruction(),
          ],
        })

        const elements = harness.elements.heroItem.queryAll();
        expect(elements.length).toBe(i);

        elements.forEach((el, index) => {
          expect(el.nativeElement.textContent.trim().includes(`${name} ${index + 1}`)).toBeTrue();
        })
      }
    }));

    it('should store full hero model (hp and attack) when adding', fakeAsync(() => {
      initComponent();

      const name = 'Model Test Hero';
      harness.setNameInputValue(name);
      harness.elements.addButton.click();

      runTasksUntilStable(fixture, {
        httpCallInstructions: [
          getPostHeroesSuccessHttpCallInstruction(),
        ],
      });

      const component = fixture.componentInstance;
      expect(component.heroes.length).toBe(1);
      const added = component.heroes[0] as any;
      expect(added.name).toBe(name);
      expect(added.hp).toBe(100);
      expect(added.attack).toBe(10);
    }));

    it('should not add hero when invalid name is provided', fakeAsync(() => {
      initComponent();

      expect(harness.elements.heroItem.queryAll().length).toBe(0);

      const name = ``;

      for (let i = 1; i <= 10; i++) {
        harness.setNameInputValue(`${name}`);
        harness.elements.addButton.click();
        runTasksUntilStable(fixture)

        const elements = harness.elements.heroItem.queryAll();
        expect(elements.length).toBe(0);
      }
    }));

    it('should not add hero when server responds with error', fakeAsync(() => {
      initComponent();

      expect(harness.elements.heroItem.queryAll().length).toBe(0);

      const name = `Test Hero`;

      for (let i = 1; i <= 10; i++) {
        harness.setNameInputValue(`${name}`);
        harness.elements.addButton.click();
        runTasksUntilStable(fixture, {
          httpCallInstructions: [
            getPostHeroesFailHttpCallInstruction(),
          ],
        })

        const elements = harness.elements.heroItem.queryAll();
        expect(elements.length).toBe(0);
      }
    }));

    it('should clear input field after adding hero', fakeAsync(() => {
      initComponent();

      expect(harness.elements.heroItem.queryAll().length).toBe(0);

      const name = `Test Hero`;
      harness.setNameInputValue(`${name}`);
      harness.elements.addButton.click();
      runTasksUntilStable(fixture, {
        httpCallInstructions: [
          getPostHeroesSuccessHttpCallInstruction(),
        ],
      })
      expect(harness.elements.nameInput.query().nativeElement.value).toBe('');
    }));
  })

  describe('delete hero', () => {
    it('should remove hero from list when delete button is clicked', fakeAsync(() => {
      const amountAtInitialShow = 5;

      initComponent([getHeroesSuccessHttpCallInstruction(amountAtInitialShow),]);

      expect(harness.elements.heroItem.queryAll().length).toBe(amountAtInitialShow);

      for (let i = amountAtInitialShow; i > 0; i--) {
        harness.elements.heroDeleteButton.click();
        runTasksUntilStable(fixture, {
          httpCallInstructions: [
            getDeleteHeroSuccessHttpCallInstruction(),
          ],
        })
        expect(harness.elements.heroItem.queryAll().length).toBe(i - 1);
      }
    }));

    it('should not remove hero from list if server responds with error', fakeAsync(() => {
      const amountAtInitialShow = 5;

      initComponent([getHeroesSuccessHttpCallInstruction(amountAtInitialShow),]);

      expect(harness.elements.heroItem.queryAll().length).toBe(amountAtInitialShow);

      for (let i = amountAtInitialShow; i > 0; i--) {
        harness.elements.heroDeleteButton.click();
        runTasksUntilStable(fixture, {
          httpCallInstructions: [
            getDeleteHeroFailHttpCallInstruction(),
          ],
        })
        expect(harness.elements.heroItem.queryAll().length).toBe(amountAtInitialShow);
      }
    }));
  })

  function initComponent(httpCallInstructions: HttpCallInstruction[] = defaultHttpCallInstructions) {
    fixture = TestBed.createComponent(HeroesComponent);
    harness = new HeroesHarness(fixture.debugElement);

    runTasksUntilStable(fixture, {
      httpCallInstructions,
    })
  }
})
