import { Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';

const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 480;

export function snapToNearest(input: number, steps: readonly number[]): number {
  if (input === 0) {
    return 0;
  }
  return steps.reduce((nearest, step) => {
    const currentDistance = Math.abs(input - step);
    const nearestDistance = Math.abs(input - nearest);
    return currentDistance < nearestDistance ||
      (currentDistance === nearestDistance && step < nearest)
      ? step
      : nearest;
  }, steps[0]);
}

@Component({
  selector: 'app-time-input',
  standalone: true,
  template: `
    <div class="time-input">
      @for (unit of units(); track unit.key) {
        <label class="time-unit">
          <span>{{ unit.label }}</span>
          <input
            type="range"
            min="0"
            [max]="unit.steps.length"
            [value]="unit.index"
            (input)="onSlider(unit.key, $any($event.target).value)"
          />
          <input
            class="number-input"
            type="number"
            min="0"
            step="1"
            [value]="unit.value"
            (input)="onText(unit.key, $any($event.target).value)"
            [attr.aria-invalid]="errorKey() === unit.key"
          />
        </label>
      }
      @if (errorKey()) {
        <p class="field-error">0以上の整数を入力してください。</p>
      }
    </div>
  `,
  styles: [
    `
      .time-input {
        display: grid;
        gap: 10px;
      }

      .time-unit {
        align-items: center;
        display: grid;
        gap: 8px;
        grid-template-columns: 44px minmax(120px, 1fr) 76px;
      }

      span {
        color: #3c4948;
        font-size: 0.85rem;
      }

      input[type='range'] {
        width: 100%;
      }

      .number-input {
        border: 1px solid #bcc8c6;
        border-radius: 6px;
        min-width: 0;
        padding: 7px 8px;
      }

      .field-error {
        color: #a12622;
        font-size: 0.8rem;
        margin: 0;
      }
    `
  ]
})
export class TimeInputComponent {
  readonly MINUTE_STEPS = [5, 10, 15, 20, 30, 45] as const;
  readonly HOUR_STEPS = [1, 2, 3, 4, 6] as const;
  readonly DAY_STEPS = [1, 2, 3, 4, 5, 7, 10, 15, 20] as const;

  private readonly totalMinutes = signal<number | null>(null);
  readonly errorKey = signal<'minutes' | 'hours' | 'days' | null>(null);

  readonly units = computed(() => {
    const parts = this.parts();
    return [
      {
        key: 'minutes' as const,
        label: '分',
        steps: this.MINUTE_STEPS,
        value: parts.minutes,
        index: this.stepIndex(parts.minutes, this.MINUTE_STEPS)
      },
      {
        key: 'hours' as const,
        label: '時間',
        steps: this.HOUR_STEPS,
        value: parts.hours,
        index: this.stepIndex(parts.hours, this.HOUR_STEPS)
      },
      {
        key: 'days' as const,
        label: '日',
        steps: this.DAY_STEPS,
        value: parts.days,
        index: this.stepIndex(parts.days, this.DAY_STEPS)
      }
    ];
  });

  @Output() readonly valueChange = new EventEmitter<number>();

  @Input() set value(value: number | null) {
    this.totalMinutes.set(value);
  }

  snapToNearest(input: number, steps: readonly number[]): number {
    return snapToNearest(input, steps);
  }

  onSlider(unit: 'minutes' | 'hours' | 'days', indexValue: string): void {
    const index = Number(indexValue);
    if (index === 0) {
      this.updatePart(unit, 0);
      return;
    }
    const steps = this.stepsFor(unit);
    const value = steps[index - 1] ?? steps[steps.length - 1];
    this.updatePart(unit, value);
  }

  onText(unit: 'minutes' | 'hours' | 'days', rawValue: string): void {
    const value = Number(rawValue);
    if (rawValue.trim() === '' || !Number.isInteger(value) || value < 0) {
      this.errorKey.set(unit);
      return;
    }
    this.errorKey.set(null);
    this.updatePart(unit, value);
  }

  private updatePart(unit: 'minutes' | 'hours' | 'days', value: number): void {
    const snapped = this.snapToNearest(value, this.stepsFor(unit));
    const current = this.parts();
    const next = { ...current, [unit]: snapped };
    const total =
      next.days * MINUTES_PER_DAY + next.hours * MINUTES_PER_HOUR + next.minutes;
    this.totalMinutes.set(total);
    this.valueChange.emit(total);
  }

  private parts(): { minutes: number; hours: number; days: number } {
    const value = this.totalMinutes() ?? 0;
    const days = Math.floor(value / MINUTES_PER_DAY);
    const afterDays = value % MINUTES_PER_DAY;
    const hours = Math.floor(afterDays / MINUTES_PER_HOUR);
    const minutes = afterDays % MINUTES_PER_HOUR;
    return { minutes, hours, days };
  }

  private stepsFor(unit: 'minutes' | 'hours' | 'days'): readonly number[] {
    if (unit === 'minutes') {
      return this.MINUTE_STEPS;
    }
    if (unit === 'hours') {
      return this.HOUR_STEPS;
    }
    return this.DAY_STEPS;
  }

  private stepIndex(value: number, steps: readonly number[]): number {
    if (value <= 0) {
      return 0;
    }
    return steps.indexOf(this.snapToNearest(value, steps)) + 1;
  }
}
