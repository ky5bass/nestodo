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

    component.onSlider('hours', '3');

    expect(component.valueChange.emit).toHaveBeenCalledWith(180);
  });

  it('スライダー左端（index=0）で0を設定する', () => {
    spyOn(component.valueChange, 'emit');

    component.onSlider('minutes', '0');

    expect(component.valueChange.emit).toHaveBeenCalledWith(0);
  });

  it('負の数または非整数の入力ではエラーを表示し保存値を通知しない', () => {
    spyOn(component.valueChange, 'emit');

    component.onText('minutes', '-1');

    expect(component.errorKey()).toBe('minutes');
    expect(component.valueChange.emit).not.toHaveBeenCalled();

    component.onText('hours', '1.5');

    expect(component.errorKey()).toBe('hours');
    expect(component.valueChange.emit).not.toHaveBeenCalled();

    component.onText('days', '');

    expect(component.errorKey()).toBe('days');
    expect(component.valueChange.emit).not.toHaveBeenCalled();
  });

  it('0入力ではエラーを表示せず保存値を通知する', () => {
    spyOn(component.valueChange, 'emit');

    component.onText('minutes', '0');

    expect(component.errorKey()).toBeNull();
    expect(component.valueChange.emit).toHaveBeenCalledWith(0);
  });

  it('Property 2: Time_Inputの最近傍スナップ', () => {
    const stepSets = [
      [5, 10, 15, 20, 30, 45],
      [1, 2, 3, 4, 6],
      [1, 2, 3, 4, 5, 7, 10, 15, 20]
    ] as const;

    fc.assert(
      fc.property(fc.integer({ min: 0, max: 200 }), fc.constantFrom(...stepSets), (input, steps) => {
        const actual = snapToNearest(input, steps);
        if (input === 0) {
          expect(actual).toBe(0);
          return;
        }
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
