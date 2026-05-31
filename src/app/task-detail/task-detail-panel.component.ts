import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, effect, signal } from '@angular/core';

import { BatchCompletionModalComponent } from './batch-completion-modal.component';
import { DetailSaveService } from './detail-save.service';
import { RevertModalComponent } from './revert-modal.component';
import {
  RevertResult,
  TaskContentField,
  TaskDetail,
  TaskPriority,
  TaskStatus,
  TaskType
} from './task-detail.model';
import { TimeInputComponent } from './time-input.component';

@Component({
  selector: 'app-task-detail-panel',
  standalone: true,
  imports: [CommonModule, TimeInputComponent, RevertModalComponent, BatchCompletionModalComponent],
  template: `
    @if (currentTask(); as detail) {
      <aside class="detail-panel" aria-label="タスク詳細">
        <header class="panel-header">
          <input
            class="title-input"
            [readonly]="batchEditMode"
            [value]="detail.task_name"
            (change)="saveName(detail, $any($event.target).value)"
            aria-label="タスク名"
          />
          <button type="button" class="icon-button" aria-label="閉じる" (click)="close.emit()">
            ×
          </button>
        </header>

        <div class="actions-row">
          @if (detail.status !== 'complete') {
            <button
              type="button"
              class="complete-button"
              (click)="complete(detail)"
              [disabled]="save.isCompletionBusy(detail.id)"
            >
              @if (save.isCompletionBusy(detail.id)) {
                <span class="spinner" aria-hidden="true"></span>
                処理中
              } @else {
                完了
              }
            </button>
          }
          <button
            type="button"
            class="export-button"
            [attr.aria-label]="detail.export_flag ? '日報出力対象' : '日報出力対象外'"
            (click)="toggleExport(detail)"
          >
            {{ detail.export_flag ? '◉' : '○' }}
          </button>
        </div>

        <section class="fields">
          <label>
            種別
            <select
              [value]="detail.task_type"
              (change)="saveTaskType(detail, $any($event.target).value)"
            >
              <option value="TODO">TODO</option>
              <option value="SCHEDULE">SCHEDULE</option>
            </select>
          </label>

          <label>
            {{ eventLabel(detail.task_type) }}
            <input
              type="datetime-local"
              [value]="toLocalInputValue(detail.event_at)"
              (change)="saveEventAt(detail, $any($event.target).value)"
            />
          </label>

          <label>
            ステータス
            <select
              [value]="detail.status"
              (change)="changeStatus(detail, $any($event.target).value)"
            >
              <option value="incomplete">未完了</option>
              <option value="complete">完了</option>
            </select>
          </label>

          <label>
            進捗
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              [value]="detail.progress ?? ''"
              (focus)="activeLastDoneField.set('progress')"
              (change)="saveProgress(detail, $any($event.target).value)"
              [attr.aria-invalid]="progressError()"
              [readonly]="save.isCompletionBusy(detail.id)"
            />
          </label>
          @if (progressError()) {
            <p class="field-error">進捗は0〜100の整数で入力してください。</p>
          }

          <label>
            優先度
            <select
              [value]="detail.priority"
              (change)="savePriority(detail, $any($event.target).value)"
            >
              <option value="none">なし</option>
              <option value="priority">優先</option>
              <option value="highest">最優先</option>
            </select>
          </label>

          <div class="field-block">
            <span>予定時間</span>
            <app-time-input
              [value]="detail.estimated_time"
              (valueChange)="saveEstimatedTime(detail, $event)"
            />
          </div>

          <div class="field-block" (focusin)="activeLastDoneField.set('actual_time')">
            <span>実績時間</span>
            <app-time-input
              [value]="detail.actual_time"
              (valueChange)="saveActualTime(detail, $event)"
            />
          </div>

          @if (activeLastDoneField() === 'progress' || activeLastDoneField() === 'actual_time') {
            <label class="checkbox-row">
              <input
                type="checkbox"
                [checked]="updateLastDone"
                (change)="updateLastDone = $any($event.target).checked"
              />
              本日の実績として更新する
            </label>
          }

          <label>
            最終実施日
            <input type="text" [value]="detail.last_done_at ?? ''" readonly />
          </label>
        </section>

        <section class="content-fields">
          @for (contentField of contentFields; track contentField.key) {
            <label>
              {{ contentField.label }}
              <textarea
                rows="5"
                [value]="contentValue(detail, contentField.key)"
                (change)="saveContent(detail, contentField.key, $any($event.target).value)"
              ></textarea>
            </label>
          }
        </section>

        @if (save.error(); as error) {
          <div class="save-error" role="alert">
            <span>{{ error.message }}</span>
            <button type="button" (click)="save.retry(error.taskId, error.field)">リトライ</button>
          </div>
        }
      </aside>

      <app-revert-modal [open]="revertOpen()" (closed)="handleRevert(detail, $event)" />
      <app-batch-completion-modal
        [open]="save.batchCompletionData() !== null"
        [data]="save.batchCompletionData()"
        [loading]="save.batchCompletionLoading()"
        [error]="save.batchCompletionError()"
        (confirm)="save.confirmBatchCompletion()"
        (retry)="save.confirmBatchCompletion()"
        (cancelled)="save.cancelBatchCompletion()"
      />
    }
  `,
  styles: [
    `
      .detail-panel {
        background: #ffffff;
        border-left: 1px solid #ccd7d5;
        box-shadow: -12px 0 36px rgb(18 29 29 / 14%);
        display: grid;
        gap: 18px;
        height: 100vh;
        max-width: min(420px, 100vw);
        overflow: auto;
        padding: 18px;
        position: fixed;
        right: 0;
        top: 0;
        width: 420px;
        z-index: 30;
      }

      .panel-header,
      .actions-row {
        align-items: center;
        display: flex;
        gap: 10px;
      }

      .panel-header {
        justify-content: space-between;
      }

      .title-input {
        border: 1px solid transparent;
        border-radius: 6px;
        color: #172120;
        flex: 1;
        font-size: 1.25rem;
        font-weight: 700;
        min-width: 0;
        padding: 8px;
      }

      .title-input:focus {
        border-color: #79a39f;
        outline: none;
      }

      .icon-button,
      .export-button {
        align-items: center;
        background: #ffffff;
        border: 1px solid #b9c6c4;
        border-radius: 6px;
        cursor: pointer;
        display: inline-flex;
        height: 36px;
        justify-content: center;
        width: 36px;
      }

      .complete-button {
        align-items: center;
        background: #1f6f68;
        border: 1px solid #1f6f68;
        border-radius: 6px;
        color: #ffffff;
        cursor: pointer;
        display: inline-flex;
        gap: 8px;
        justify-content: center;
        min-width: 78px;
        padding: 8px 12px;
      }

      .complete-button:disabled {
        cursor: progress;
        opacity: 0.72;
      }

      .fields,
      .content-fields {
        display: grid;
        gap: 14px;
      }

      label,
      .field-block {
        color: #344240;
        display: grid;
        gap: 6px;
        font-size: 0.9rem;
      }

      input,
      select,
      textarea {
        border: 1px solid #bcc8c6;
        border-radius: 6px;
        color: #172120;
        font: inherit;
        min-width: 0;
        padding: 8px;
        width: 100%;
      }

      textarea {
        resize: vertical;
      }

      .checkbox-row {
        align-items: center;
        display: flex;
        gap: 8px;
      }

      .checkbox-row input {
        width: auto;
      }

      .field-error {
        color: #a12622;
        font-size: 0.8rem;
        margin: -8px 0 0;
      }

      .save-error {
        align-items: center;
        background: #fff0ed;
        border: 1px solid #e5b2a7;
        border-radius: 6px;
        color: #76231d;
        display: flex;
        gap: 8px;
        justify-content: space-between;
        padding: 10px;
      }

      .save-error button {
        background: #ffffff;
        border: 1px solid #c98d81;
        border-radius: 6px;
        cursor: pointer;
        padding: 6px 8px;
      }

      .spinner {
        animation: spin 0.8s linear infinite;
        border: 2px solid rgb(255 255 255 / 44%);
        border-radius: 999px;
        border-top-color: #ffffff;
        height: 14px;
        width: 14px;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      @media (max-width: 520px) {
        .detail-panel {
          width: 100vw;
        }
      }
    `
  ]
})
export class TaskDetailPanelComponent {
  @Input() set task(value: TaskDetail | null) {
    this.save.selectTask(value);
  }
  @Input() batchEditMode = false;
  @Output() readonly close = new EventEmitter<void>();

  readonly currentTask = this.save.selectedTask;
  readonly progressError = signal(false);
  readonly revertOpen = signal(false);
  readonly activeLastDoneField = signal<'progress' | 'actual_time' | null>(null);
  readonly contentFields: { key: TaskContentField; label: string }[] = [
    { key: 'pre_info', label: '事前情報' },
    { key: 'notes', label: 'メモ' },
    { key: 'reflection', label: '振り返り' }
  ];

  updateLastDone = true;

  constructor(readonly save: DetailSaveService) {
    effect(() => {
      if (this.currentTask()) {
        this.progressError.set(false);
      }
    });
  }

  eventLabel(taskType: TaskType): string {
    return taskType === 'TODO' ? '期限' : '開始日時';
  }

  saveName(task: TaskDetail, value: string): void {
    if (this.batchEditMode || value.trim() === '') {
      return;
    }
    this.save.saveField(task.id, 'task_name', value);
  }

  saveTaskType(task: TaskDetail, value: TaskType): void {
    this.save.saveField(task.id, 'task_type', value);
  }

  saveEventAt(task: TaskDetail, value: string): void {
    this.save.saveField(task.id, 'event_at', value ? new Date(value).toISOString() : null);
  }

  changeStatus(task: TaskDetail, value: TaskStatus): void {
    if (task.status === 'complete' && value === 'incomplete') {
      this.revertOpen.set(true);
      return;
    }
    if (value === 'complete') {
      this.complete(task);
      return;
    }
    this.save.saveField(task.id, 'status', value);
  }

  saveProgress(task: TaskDetail, rawValue: number | string): void {
    this.activeLastDoneField.set('progress');
    const value = Number(rawValue);
    if (!Number.isInteger(value) || value < 0 || value > 100) {
      this.progressError.set(true);
      return;
    }
    this.progressError.set(false);
    if (value === 100) {
      this.save.saveFields(
        task.id,
        { progress: 100, status: 'complete' },
        { tz_offset: new Date().getTimezoneOffset() }
      );
      return;
    }
    this.save.saveField(task.id, 'progress', value, this.lastDoneOptions());
  }

  savePriority(task: TaskDetail, value: TaskPriority): void {
    this.save.saveField(task.id, 'priority', value);
  }

  saveEstimatedTime(task: TaskDetail, value: number): void {
    this.save.saveField(task.id, 'estimated_time', value);
  }

  saveActualTime(task: TaskDetail, value: number): void {
    this.activeLastDoneField.set('actual_time');
    this.save.saveField(task.id, 'actual_time', value, this.lastDoneOptions());
  }

  saveContent(task: TaskDetail, field: TaskContentField, value: string): void {
    this.save.saveContent(task.id, field, value);
  }

  toggleExport(task: TaskDetail): void {
    this.save.saveField(task.id, 'export_flag', !task.export_flag);
  }

  complete(task: TaskDetail): void {
    this.save.saveFields(
      task.id,
      { status: 'complete', progress: 100 },
      { tz_offset: new Date().getTimezoneOffset() }
    );
  }

  handleRevert(task: TaskDetail, result: RevertResult): void {
    this.revertOpen.set(false);
    if (!result.confirmed || result.progress === undefined) {
      return;
    }
    this.save.saveFields(task.id, {
      status: 'incomplete',
      progress: result.progress
    });
  }

  contentValue(task: TaskDetail, field: TaskContentField): string {
    return task.task_contents?.[field] ?? '';
  }

  toLocalInputValue(value: string | null): string {
    if (!value) {
      return '';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 16);
  }

  private lastDoneOptions(): { update_last_done: boolean; tz_offset?: number } {
    if (!this.updateLastDone) {
      return { update_last_done: false };
    }
    return { update_last_done: true, tz_offset: new Date().getTimezoneOffset() };
  }
}
