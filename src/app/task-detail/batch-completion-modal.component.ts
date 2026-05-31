import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  Output,
  computed,
  signal
} from '@angular/core';

import { BatchCompletionModalData, PendingChild } from './task-detail.model';

@Component({
  selector: 'app-batch-completion-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (open) {
      @if (data; as modalData) {
        <div class="backdrop" role="presentation" (click)="cancel()"></div>
        <section
          class="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="batch-completion-title"
        >
          <header>
            <h2 id="batch-completion-title">子孫タスクも一括で完了しますか？</h2>
            <p>{{ modalData.taskName }}</p>
          </header>

          <ul class="child-list" aria-label="未完了子孫タスク">
            @for (child of displayedChildren(); track child.id || child.task_id) {
              <li>
                <span>{{ child.task_name }}</span>
                <strong>{{ statusLabel(child.status) }}</strong>
              </li>
            }
          </ul>

          @if (remainingCount() > 0) {
            <p class="remaining">他{{ remainingCount() }}件</p>
          }

          @if (error) {
            <div class="modal-error" role="alert">
              <span>{{ error }}</span>
              <button type="button" class="secondary" (click)="retry.emit()" [disabled]="loading">
                リトライ
              </button>
            </div>
          }

          <div class="actions">
            <button type="button" class="secondary" (click)="cancel()" [disabled]="loading">
              キャンセル
            </button>
            <button type="button" class="primary" (click)="confirm.emit()" [disabled]="loading">
              @if (loading) {
                <span class="spinner" aria-hidden="true"></span>
                処理中
              } @else {
                一括完了
              }
            </button>
          </div>
        </section>
      }
    }
  `,
  styles: [
    `
      .backdrop {
        background: rgb(19 29 29 / 42%);
        inset: 0;
        position: fixed;
        z-index: 50;
      }

      .modal {
        background: #ffffff;
        border: 1px solid #c7d1cf;
        border-radius: 8px;
        box-shadow: 0 18px 50px rgb(13 24 24 / 24%);
        display: grid;
        gap: 16px;
        left: 50%;
        max-width: min(460px, calc(100vw - 32px));
        padding: 20px;
        position: fixed;
        top: 50%;
        transform: translate(-50%, -50%);
        width: 100%;
        z-index: 51;
      }

      header,
      h2,
      p,
      ul {
        margin: 0;
      }

      h2 {
        color: #172120;
        font-size: 1.1rem;
      }

      header {
        display: grid;
        gap: 6px;
      }

      header p,
      .remaining {
        color: #60706f;
        font-size: 0.9rem;
      }

      .child-list {
        border: 1px solid #d6dfdd;
        border-radius: 6px;
        display: grid;
        list-style: none;
        max-height: 300px;
        overflow: auto;
        padding: 0;
      }

      .child-list li {
        align-items: center;
        display: flex;
        gap: 10px;
        justify-content: space-between;
        min-height: 42px;
        padding: 9px 12px;
      }

      .child-list li + li {
        border-top: 1px solid #e3e9e8;
      }

      .child-list span {
        min-width: 0;
        overflow-wrap: anywhere;
      }

      .child-list strong {
        color: #7b4d16;
        flex: 0 0 auto;
        font-size: 0.85rem;
      }

      .modal-error {
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

      .actions {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
      }

      button {
        align-items: center;
        border: 1px solid #9dafac;
        border-radius: 6px;
        cursor: pointer;
        display: inline-flex;
        gap: 8px;
        justify-content: center;
        min-height: 38px;
        padding: 8px 12px;
      }

      button:disabled {
        cursor: progress;
        opacity: 0.68;
      }

      .primary {
        background: #1f6f68;
        border-color: #1f6f68;
        color: #ffffff;
        min-width: 104px;
      }

      .secondary {
        background: #ffffff;
        color: #263331;
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
    `
  ]
})
export class BatchCompletionModalComponent {
  readonly DISPLAY_LIMIT = 10;

  private readonly modalData = signal<BatchCompletionModalData | null>(null);

  @Input() open = false;
  @Input() loading = false;
  @Input() error: string | null = null;
  @Input() set data(value: BatchCompletionModalData | null) {
    this.modalData.set(value);
  }
  get data(): BatchCompletionModalData | null {
    return this.modalData();
  }

  @Output() readonly confirm = new EventEmitter<void>();
  @Output() readonly cancelled = new EventEmitter<void>();
  @Output() readonly retry = new EventEmitter<void>();

  readonly displayedChildren = computed<PendingChild[]>(() =>
    (this.modalData()?.pendingChildren ?? []).slice(0, this.DISPLAY_LIMIT)
  );
  readonly remainingCount = computed(() =>
    Math.max((this.modalData()?.pendingChildren.length ?? 0) - this.DISPLAY_LIMIT, 0)
  );

  @HostListener('document:keydown.escape')
  closeOnEscape(): void {
    this.cancel();
  }

  cancel(): void {
    if (!this.open || this.loading) {
      return;
    }
    this.cancelled.emit();
  }

  statusLabel(status: string): string {
    return status === 'incomplete' ? '未完了' : '完了';
  }
}
