import { Component, EventEmitter, Input, Output, signal } from '@angular/core';

import { RevertResult } from './task-detail.model';

@Component({
  selector: 'app-revert-modal',
  standalone: true,
  template: `
    @if (open) {
      <div class="backdrop" role="presentation" (click)="cancel()"></div>
      <section
        class="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="revert-title"
      >
        <h2 id="revert-title">完了を取り消しますか</h2>
        <p>未完了へ戻すには、100未満の進捗を指定してください。</p>
        <label>
          進捗
          <input
            type="number"
            min="0"
            max="99"
            step="1"
            [value]="progress()"
            (input)="progress.set($any($event.target).value)"
            [attr.aria-invalid]="hasError()"
          />
        </label>
        @if (hasError()) {
          <p class="field-error">進捗は0〜99の整数で入力してください。</p>
        }
        <div class="actions">
          <button type="button" class="secondary" (click)="cancel()">キャンセル</button>
          <button type="button" class="primary" (click)="confirm()" [disabled]="hasError()">
            確定
          </button>
        </div>
      </section>
    }
  `,
  styles: [
    `
      .backdrop {
        background: rgb(19 29 29 / 42%);
        inset: 0;
        position: fixed;
        z-index: 40;
      }

      .modal {
        background: #ffffff;
        border: 1px solid #c7d1cf;
        border-radius: 8px;
        box-shadow: 0 18px 50px rgb(13 24 24 / 24%);
        display: grid;
        gap: 14px;
        left: 50%;
        max-width: min(420px, calc(100vw - 32px));
        padding: 20px;
        position: fixed;
        top: 50%;
        transform: translate(-50%, -50%);
        width: 100%;
        z-index: 41;
      }

      h2,
      p {
        margin: 0;
      }

      h2 {
        font-size: 1.1rem;
      }

      label {
        display: grid;
        gap: 6px;
      }

      input {
        border: 1px solid #bcc8c6;
        border-radius: 6px;
        padding: 8px;
      }

      .field-error {
        color: #a12622;
        font-size: 0.85rem;
      }

      .actions {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
      }

      button {
        border: 1px solid #9dafac;
        border-radius: 6px;
        cursor: pointer;
        padding: 8px 12px;
      }

      .primary {
        background: #1f6f68;
        border-color: #1f6f68;
        color: #ffffff;
      }

      .secondary {
        background: #ffffff;
        color: #263331;
      }
    `
  ]
})
export class RevertModalComponent {
  @Input() open = false;
  @Output() readonly closed = new EventEmitter<RevertResult>();

  readonly progress = signal<number | string>(0);
  readonly hasError = signal(false);

  confirm(): void {
    const value = Number(this.progress());
    const invalid = !Number.isInteger(value) || value < 0 || value > 99;
    this.hasError.set(invalid);
    if (invalid) {
      return;
    }
    this.closed.emit({ confirmed: true, progress: value });
  }

  cancel(): void {
    this.closed.emit({ confirmed: false });
  }
}
