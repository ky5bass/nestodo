import { Component, EventEmitter, Input, Output } from '@angular/core';

import { TaskType } from './task-detail.model';

@Component({
  selector: 'app-task-type-radio',
  standalone: true,
  template: `
    <fieldset class="radio-group">
      <legend>種別</legend>
      <label>
        <input
          type="radio"
          name="task-type"
          value="TODO"
          [checked]="value === 'TODO'"
          (change)="valueChange.emit('TODO')"
        />
        TODO
      </label>
      <label>
        <input
          type="radio"
          name="task-type"
          value="SCHEDULE"
          [checked]="value === 'SCHEDULE'"
          (change)="valueChange.emit('SCHEDULE')"
        />
        予定
      </label>
    </fieldset>
  `,
  styles: [
    `
      .radio-group {
        border: 0;
        display: flex;
        gap: 12px;
        margin: 0;
        padding: 0;
      }

      legend {
        color: #344240;
        flex-basis: 100%;
        font-size: 0.9rem;
        margin-bottom: 6px;
      }

      label {
        align-items: center;
        display: inline-flex;
        gap: 6px;
      }
    `
  ]
})
export class TaskTypeRadioComponent {
  @Input({ required: true }) value!: TaskType;
  @Output() readonly valueChange = new EventEmitter<TaskType>();
}
