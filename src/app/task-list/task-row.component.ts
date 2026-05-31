import { DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { TaskTreeNode } from './task-list.model';
import { DropTarget } from './edit-mode.model';

@Component({
  selector: 'app-task-row',
  standalone: true,
  template: `
    <article
      class="task-row priority-{{ node.priority }}"
      [class.selected]="selectedTaskId === node.id"
      [class.editing]="isEditMode"
      [style.marginLeft.px]="depth * 18"
      (click)="selected.emit(node.id)"
      (dragover)="onDragOver($event)"
      (drop)="onDrop($event)"
    >
      <div class="main-line">
        @if (isEditMode) {
          <button
            type="button"
            class="drag-handle"
            draggable="true"
            title="ドラッグ"
            (click)="$event.stopPropagation()"
            (dragstart)="dragStarted.emit(node.id)"
          >
            ≡
          </button>
          <input
            type="text"
            [value]="node.task_name"
            maxlength="255"
            (click)="$event.stopPropagation()"
            (change)="rename.emit({ task: node, name: $any($event.target).value })"
          />
        } @else {
          <strong>{{ node.task_name }}</strong>
        }
        <span>{{ node.event_at | date: 'yyyy/MM/dd HH:mm' }}</span>
      </div>
      <div class="meta-line">
        <span>予定 {{ formatMinutes(node.estimated_time) }}</span>
        <span>実績 {{ formatMinutes(node.actual_time) }}</span>
        <span>進捗 {{ node.progress ?? 0 }}%</span>
        @if (isEditMode) {
          <button
            type="button"
            class="delete-button"
            title="削除"
            (click)="$event.stopPropagation(); deleteRequested.emit(node)"
          >
            ×
          </button>
        }
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

      .task-row.editing {
        cursor: default;
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

      input {
        border: 1px solid #b9c6c4;
        border-radius: 6px;
        flex: 1;
        font: inherit;
        min-width: 120px;
        padding: 6px 8px;
      }

      button {
        align-items: center;
        background: #ffffff;
        border: 1px solid #b9c6c4;
        border-radius: 6px;
        color: #223331;
        cursor: pointer;
        display: inline-flex;
        font: inherit;
        justify-content: center;
        min-height: 30px;
        min-width: 30px;
      }

      .drag-handle {
        cursor: grab;
        font-size: 1.1rem;
      }

      .delete-button {
        color: #8a2d24;
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
  @Input() isEditMode = false;
  @Input() draggedTaskId: string | null = null;
  @Output() readonly selected = new EventEmitter<string>();
  @Output() readonly rename = new EventEmitter<{ task: TaskTreeNode; name: string }>();
  @Output() readonly deleteRequested = new EventEmitter<TaskTreeNode>();
  @Output() readonly dragStarted = new EventEmitter<string>();
  @Output() readonly dropped = new EventEmitter<DropTarget>();

  formatMinutes(value: number | null): string {
    if (value === null) {
      return '-';
    }
    const hours = Math.floor(value / 60);
    const minutes = value % 60;
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  }

  onDragOver(event: DragEvent): void {
    if (!this.isEditMode || !this.draggedTaskId || this.draggedTaskId === this.node.id) {
      return;
    }
    event.preventDefault();
  }

  onDrop(event: DragEvent): void {
    if (!this.isEditMode || !this.draggedTaskId || this.draggedTaskId === this.node.id) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const ratio = (event.clientY - rect.top) / rect.height;
    const position = ratio < 0.33 ? 'before' : ratio > 0.66 ? 'after' : 'inside';
    this.dropped.emit({
      draggedId: this.draggedTaskId,
      targetId: this.node.id,
      position
    });
  }
}
