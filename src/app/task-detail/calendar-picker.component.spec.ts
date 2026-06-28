import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalendarPickerComponent } from './calendar-picker.component';

describe('CalendarPickerComponent', () => {
  let fixture: ComponentFixture<CalendarPickerComponent>;
  let component: CalendarPickerComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CalendarPickerComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CalendarPickerComponent);
    component = fixture.componentInstance;
  });

  it('ショートカットは基準日から指定日数後のローカル00:00を通知してピッカーを閉じる', () => {
    jasmine.clock().install();
    try {
      jasmine.clock().mockDate(new Date(2026, 5, 1, 12, 0, 0));
      const emitSpy = spyOn(component.valueChange, 'emit');
      component.open.set(true);

      component.selectShortcut(7);

      const emitted = emitSpy.calls.mostRecent().args[0];
      expect(emitted).toBe('2026-06-08T00:00:00');
      expect(component.open()).toBeFalse();
    } finally {
      jasmine.clock().uninstall();
    }
  });

  it('ショートカットは選択済みの時刻を維持して日付だけを変更する', () => {
    jasmine.clock().install();
    try {
      jasmine.clock().mockDate(new Date(2026, 5, 1, 12, 0, 0));
      const emitSpy = spyOn(component.valueChange, 'emit');
      component.value = '2026-05-20T14:35:00';

      component.selectShortcut(1);

      const emitted = emitSpy.calls.mostRecent().args[0];
      expect(emitted).toBe('2026-06-02T14:35:00');
    } finally {
      jasmine.clock().uninstall();
    }
  });

  it('時刻変更はタイムゾーン付きISO文字列ではなくローカル日時文字列を通知する', () => {
    const emitSpy = spyOn(component.valueChange, 'emit');
    component.value = '2026-06-01T14:35:00';

    component.selectTime({ hours: 15, minutes: 40 });

    const emitted = emitSpy.calls.mostRecent().args[0];
    expect(emitted).toBe('2026-06-01T15:40:00');
  });
});
