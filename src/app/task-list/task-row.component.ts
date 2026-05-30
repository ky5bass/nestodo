import { DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { TaskTreeNode } from './task-list.model';

@Component({
  selector: 'app-task-row',
  standalone: true,
  template: `
    <article
      class="task-row priority-{{ node.priority }}"
      [class.selected]="selectedTaskId === node.id"
      [style.marginLeft.px]="depth * 18"
      (click)="selected.emit(node.id)"
    >
      <div class="main-line">
        <strong>{{ node.task_name }}</strong>
        <span>{{ node.event_at | date: 'yyyy/MM/dd HH:mm' }}</span>
      </div>
      <div class="meta-line">
        <span>予定 {{ formatMinutes(node.estimated_time) }}</span>
        <span>実績 {{ formatMinutes(node.actual_time) }}</span>
        <span>進捗 {{ node.progress ?? 0 }}%</span>
      </div>
      @if (node.preview) {
        <p>{{ node.preview }}</p>
      }
    </article>
  `,
  styles: [
    `
      .task-row {
        background: #ffffff;
        border: 1px solid #d4dddb;
        border-radius: 8px;
        cursor: pointer;
        display: grid;
        gap: 6px;
        padding: 12px;
      }

      .task-row + app-task-row,
      :host + :host {
        margin-top: 8px;
      }

      .task-row.selected {
        border-left: 4px solid #1f6f68;
        background: #edf8f6;
      }

      .priority-priority {
        background: #fff8cf;
      }

      .priority-highest {
        background: #ffe7e1;
      }

      .main-line,
      .meta-line {
        align-items: center;
        display: flex;
        gap: 10px;
        justify-content: space-between;
      }

      strong {
        min-width: 0;
        overflow-wrap: anywhere;
      }

      span {
        color: #5b6b69;
        font-size: 0.86rem;
      }

      p {
        color: #596866;
        font-size: 0.86rem;
        margin: 0;
        overflow-wrap: anywhere;
      }
    `
  ],
  imports: [DatePipe]
})
export class TaskRowComponent {
  @Input({ required: true }) node!: TaskTreeNode;
  @Input() depth = 0;
  @Input() selectedTaskId: string | null = null;
  @Output() readonly selected = new EventEmitter<string>();

  formatMinutes(value: number | null): string {
    if (value === null) {
      return '-';
    }
    const hours = Math.floor(value / 60);
    const minutes = value % 60;
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  }
}
