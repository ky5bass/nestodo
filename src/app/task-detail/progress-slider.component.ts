import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-progress-slider',
  standalone: true,
  template: `
    <label class="progress-field">
      <span>進捗</span>
      <input
        type="range"
        min="0"
        max="100"
        step="1"
        [value]="value ?? 0"
        [disabled]="disabled"
        (input)="valueChange.emit($any($event.target).valueAsNumber)"
      />
      <output>{{ value ?? 0 }}%</output>
    </label>
  `,
  styles: [
    `
      .progress-field {
        align-items: center;
        display: grid;
        gap: 8px;
        grid-template-columns: 48px minmax(120px, 1fr) 48px;
      }

      span {
        color: #344240;
        font-size: 0.9rem;
      }

      input {
        width: 100%;
      }

      output {
        color: #344240;
        font-variant-numeric: tabular-nums;
        text-align: right;
      }
    `
  ]
})
export class ProgressSliderComponent {
  @Input() value: number | null = 0;
  @Input() disabled = false;
  @Output() readonly valueChange = new EventEmitter<number>();
}
