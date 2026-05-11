import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TestssComponent } from './testss.component';

describe('TestssComponent', () => {
  let component: TestssComponent;
  let fixture: ComponentFixture<TestssComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestssComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TestssComponent);
    component = fixture.componentInstance;
    fixture.autoDetectChanges()
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('test', () => {
    console.log(fixture.isStable())
    console.log(fixture.isStable())
    console.log(fixture.isStable())
    console.log(fixture.isStable())
    console.log(fixture.isStable())
  });
});
