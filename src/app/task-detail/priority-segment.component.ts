import { Component, EventEmitter, Input, Output } from '@angular/core';

import { TaskPriority } from './task-detail.model';

@Component({
  selector: 'app-priority-segment',
  standalone: true,
  template: `
    <div class="field">
      <span>優先度</span>
      <div class="segments" role="group" aria-label="優先度">
        @for (option of options; track option.value) {
          <button
            type="button"
            [class.active]="value === option.value"
            (click)="valueChange.emit(option.value)"
          >
            {{ option.label }}
          </button>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .field {
        display: grid;
        gap: 6px;
      }

      span {
        color: #344240;
        font-size: 0.9rem;
      }

      .segments {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
      }

      button {
        background: #ffffff;
        border: 1px solid #bcc8c6;
        color: #223331;
        cursor: pointer;
        font: inherit;
        min-height: 36px;
        padding: 7px 8px;
      }

      button:first-child {
        border-radius: 6px 0 0 6px;
      }

      button:last-child {
        border-radius: 0 6px 6px 0;
      }

      button + button {
        border-left: 0;
      }

      .active {
        background: #1f6f68;
        color: #ffffff;
      }
    `
  ]
})
export class PrioritySegmentComponent {
  @Input({ required: true }) value!: TaskPriority;
  @Output() readonly valueChange = new EventEmitter<TaskPriority>();

  readonly options: { value: TaskPriority; label: string }[] = [
    { value: 'none', label: 'なし' },
    { value: 'priority', label: '優先' },
    { value: 'highest', label: '最優先' }
  ];
}
