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

  it('ショートカットは基準日から指定日数後の00:00を通知してピッカーを閉じる', () => {
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date(2026, 5, 1, 12, 0, 0));
    spyOn(component.valueChange, 'emit');
    component.open.set(true);

    component.selectShortcut(7);

    const emitted = component.valueChange.emit.calls.mostRecent().args[0];
    expect(emitted).toBe(new Date(2026, 5, 8, 0, 0, 0).toISOString());
    expect(component.open()).toBeFalse();
    jasmine.clock().uninstall();
  });
});
