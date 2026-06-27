import { Component, EventEmitter, Input, Output, signal } from '@angular/core';

import { TimePickerComponent, TimePickerValue } from './time-picker.component';

@Component({
  selector: 'app-calendar-picker',
  standalone: true,
  imports: [TimePickerComponent],
  template: `
    <div class="calendar-field">
      <button type="button" class="display-button" (click)="toggleOpen()">
        {{ displayValue() }}
      </button>
      @if (open()) {
        <div class="picker">
          <div class="shortcuts">
            @for (shortcut of SHORTCUTS; track shortcut.offsetDays) {
              <button type="button" (click)="selectShortcut(shortcut.offsetDays)">
                {{ shortcut.label }}
              </button>
            }
          </div>
          <input type="date" [value]="dateValue()" (change)="selectDate($any($event.target).value)" />
          <app-time-picker
            [hours]="timeParts().hours"
            [minutes]="timeParts().minutes"
            (timeChange)="selectTime($event)"
          />
        </div>
      }
    </div>
  `,
  styles: [
    `
      .calendar-field {
        display: grid;
        gap: 8px;
      }

      .display-button,
      .shortcuts button {
        background: #ffffff;
        border: 1px solid #bcc8c6;
        border-radius: 6px;
        color: #172120;
        cursor: pointer;
        font: inherit;
        min-height: 36px;
        padding: 8px;
        text-align: left;
      }

      .picker {
        border: 1px solid #d5dfdd;
        border-radius: 8px;
        display: grid;
        gap: 10px;
        padding: 10px;
      }

      .shortcuts {
        display: grid;
        gap: 8px;
        grid-template-columns: repeat(3, 1fr);
      }

      .shortcuts button {
        text-align: center;
      }

      input {
        border: 1px solid #bcc8c6;
        border-radius: 6px;
        font: inherit;
        padding: 8px;
        width: 100%;
      }
    `
  ]
})
export class CalendarPickerComponent {
  readonly SHORTCUTS = [
    { label: '今日', offsetDays: 0 },
    { label: '明日', offsetDays: 1 },
    { label: '1週間後', offsetDays: 7 }
  ];

  readonly open = signal(false);

  @Input() value: string | null = null;
  @Output() readonly valueChange = new EventEmitter<string | null>();

  toggleOpen(): void {
    this.open.update((value) => !value);
  }

  displayValue(): string {
    if (!this.value) {
      return '未設定';
    }
    const date = new Date(this.value);
    if (Number.isNaN(date.getTime())) {
      return '未設定';
    }
    return date.toLocaleString();
  }

  dateValue(): string {
    return this.localParts().date;
  }

  timeParts(): TimePickerValue {
    const parts = this.localParts();
    return { hours: parts.hours, minutes: parts.minutes };
  }

  selectShortcut(offsetDays: number): void {
    const parts = this.localParts();
    const date = new Date();
    date.setHours(parts.hours, parts.minutes, 0, 0);
    date.setDate(date.getDate() + offsetDays);
    this.emitLocal(date);
    this.open.set(false);
  }

  selectDate(value: string): void {
    if (!value) {
      this.valueChange.emit(null);
      return;
    }
    const parts = this.localParts();
    this.emitFromParts(value, parts.hours, parts.minutes);
  }

  selectTime(value: TimePickerValue): void {
    const parts = this.localParts();
    this.emitFromParts(parts.date, value.hours, value.minutes);
  }

  private emitFromParts(date: string, hours: number, minutes: number): void {
    const next = new Date(`${date}T${this.pad(hours)}:${this.pad(minutes)}:00`);
    this.emitLocal(next);
  }

  private emitLocal(date: Date): void {
    this.valueChange.emit(date.toISOString());
  }

  private localParts(): { date: string; hours: number; minutes: number } {
    const date = this.value ? new Date(this.value) : new Date();
    if (!this.value || Number.isNaN(date.getTime())) {
      date.setHours(0, 0, 0, 0);
    }
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
    return {
      date: local.toISOString().slice(0, 10),
      hours: date.getHours(),
      minutes: Math.floor(date.getMinutes() / 5) * 5
    };
  }

  private pad(value: number): string {
    return value.toString().padStart(2, '0');
  }
}
