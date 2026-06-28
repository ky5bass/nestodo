import { Component, EventEmitter, Input, Output } from '@angular/core';

export interface TimePickerValue {
  hours: number;
  minutes: number;
}

@Component({
  selector: 'app-time-picker',
  standalone: true,
  template: `
    <div class="time-picker" aria-label="時刻選択">
      <button type="button" (click)="changeHours(-1)" [disabled]="hours <= HOUR_MIN" aria-label="時間を1時間減らす">時 -</button>
      <button type="button" (click)="changeMinutes(-5)" [disabled]="minutes <= MINUTE_MIN" aria-label="分を5分減らす">分 -</button>
      <strong>{{ pad(hours) }}:{{ pad(minutes) }}</strong>
      <button type="button" (click)="changeHours(1)" [disabled]="hours >= HOUR_MAX" aria-label="時間を1時間増やす">時 +</button>
      <button type="button" (click)="changeMinutes(5)" [disabled]="minutes >= MINUTE_MAX" aria-label="分を5分増やす">分 +</button>
    </div>
  `,
  styles: [
    `
      .time-picker {
        align-items: center;
        display: grid;
        gap: 6px;
        grid-template-columns: repeat(2, 52px) 1fr repeat(2, 52px);
      }

      button {
        background: #ffffff;
        border: 1px solid #bcc8c6;
        border-radius: 6px;
        cursor: pointer;
        font: inherit;
        font-size: 0.82rem;
        height: 34px;
        padding: 0 4px;
      }

      button:disabled {
        cursor: not-allowed;
        opacity: 0.45;
      }

      strong {
        color: #263331;
        font-variant-numeric: tabular-nums;
        text-align: center;
      }
    `
  ]
})
export class TimePickerComponent {
  readonly HOUR_MIN = 0;
  readonly HOUR_MAX = 23;
  readonly MINUTE_MIN = 0;
  readonly MINUTE_MAX = 55;

  @Input() hours = 0;
  @Input() minutes = 0;
  @Output() readonly timeChange = new EventEmitter<TimePickerValue>();

  changeHours(delta: number): void {
    this.hours = Math.min(this.HOUR_MAX, Math.max(this.HOUR_MIN, this.hours + delta));
    this.emit();
  }

  changeMinutes(delta: number): void {
    this.minutes = Math.min(
      this.MINUTE_MAX,
      Math.max(this.MINUTE_MIN, this.minutes + delta)
    );
    this.minutes = Math.round(this.minutes / 5) * 5;
    this.emit();
  }

  pad(value: number): string {
    return value.toString().padStart(2, '0');
  }

  private emit(): void {
    this.timeChange.emit({ hours: this.hours, minutes: this.minutes });
  }
}
