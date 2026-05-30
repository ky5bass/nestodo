import { ComponentFixture, TestBed } from '@angular/core/testing';
import * as fc from 'fast-check';

import { TimeInputComponent, snapToNearest } from './time-input.component';

describe('TimeInputComponent', () => {
  let fixture: ComponentFixture<TimeInputComponent>;
  let component: TimeInputComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TimeInputComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TimeInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('スライダー変更を分単位の合計値として通知する', () => {
    spyOn(component.valueChange, 'emit');

    component.onSlider('hours', '2');

    expect(component.valueChange.emit).toHaveBeenCalledWith(180);
  });

  it('0以下または非整数の入力ではエラーを表示し保存値を通知しない', () => {
    spyOn(component.valueChange, 'emit');

    component.onText('minutes', '0');

    expect(component.errorKey()).toBe('minutes');
    expect(component.valueChange.emit).not.toHaveBeenCalled();
  });

  it('Property 2: Time_Inputの最近傍スナップ', () => {
    const steps = [5, 10, 15, 20, 30, 45];

    fc.assert(
      fc.property(fc.integer({ min: 1, max: 200 }), (input) => {
        const actual = snapToNearest(input, steps);
        const bestDistance = Math.min(...steps.map((step) => Math.abs(input - step)));
        const expected = steps
          .filter((step) => Math.abs(input - step) === bestDistance)
          .sort((a, b) => a - b)[0];

        expect(actual).toBe(expected);
      }),
      { numRuns: 100 }
    );
  });
});
