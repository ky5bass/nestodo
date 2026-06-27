import { ComponentFixture, TestBed } from '@angular/core/testing';
import * as fc from 'fast-check';

import { TimePickerComponent } from './time-picker.component';

describe('TimePickerComponent', () => {
  let fixture: ComponentFixture<TimePickerComponent>;
  let component: TimePickerComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TimePickerComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TimePickerComponent);
    component = fixture.componentInstance;
  });

  it('Property 5: Time_Pickerの端止まり不変条件', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            target: fc.constantFrom<'hours' | 'minutes'>('hours', 'minutes'),
            delta: fc.constantFrom(-5, -1, 1, 5)
          }),
          { minLength: 1, maxLength: 100 }
        ),
        (operations) => {
          component.hours = 12;
          component.minutes = 30;

          operations.forEach((operation) => {
            if (operation.target === 'hours') {
              component.changeHours(operation.delta);
            } else {
              component.changeMinutes(operation.delta);
            }
          });

          expect(component.hours).toBeGreaterThanOrEqual(0);
          expect(component.hours).toBeLessThanOrEqual(23);
          expect(component.minutes).toBeGreaterThanOrEqual(0);
          expect(component.minutes).toBeLessThanOrEqual(55);
          expect(component.minutes % 5).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
