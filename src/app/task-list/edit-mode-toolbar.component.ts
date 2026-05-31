import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-edit-mode-toolbar',
  standalone: true,
  template: `
    <div class="toolbar" [class.editing]="isEditMode">
      @if (!isEditMode) {
        <button type="button" (click)="editModeRequested.emit()">一括編集</button>
      } @else {
        <button type="button" (click)="saveRequested.emit()" [disabled]="saving">保存</button>
        <button type="button" class="secondary" (click)="cancelRequested.emit()" [disabled]="saving">
          キャンセル
        </button>
        <button type="button" class="secondary icon" (click)="undoRequested.emit()" [disabled]="!canUndo || saving" title="元に戻す">
          ↶
        </button>
        <button type="button" class="secondary icon" (click)="redoRequested.emit()" [disabled]="!canRedo || saving" title="やり直す">
          ↷
        </button>
        <button type="button" class="secondary" (click)="addRequested.emit()" [disabled]="saving">
          追加
        </button>
        <label>
          <input
            type="checkbox"
            [checked]="filterDisabled"
            (change)="filterChanged.emit($any($event.target).checked)"
          />
          フィルター解除
        </label>
      }
    </div>
  `,
  styles: [
    `
      .toolbar {
        align-items: center;
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 14px;
      }

      .toolbar.editing {
        border-bottom: 1px solid #d7dddc;
        padding-bottom: 14px;
      }

      button {
        background: #1f6f68;
        border: 1px solid #1f6f68;
        border-radius: 6px;
        color: #ffffff;
        cursor: pointer;
        font: inherit;
        min-height: 34px;
        padding: 6px 12px;
      }

      button.secondary {
        background: #ffffff;
        color: #223331;
      }

      button.icon {
        font-size: 1.15rem;
        min-width: 34px;
        padding: 4px 8px;
      }

      button:disabled {
        cursor: not-allowed;
        opacity: 0.45;
      }

      label {
        align-items: center;
        color: #33413f;
        display: inline-flex;
        gap: 6px;
      }
    `
  ]
})
export class EditModeToolbarComponent {
  @Input() isEditMode = false;
  @Input() hasChanges = false;
  @Input() canUndo = false;
  @Input() canRedo = false;
  @Input() filterDisabled = false;
  @Input() saving = false;

  @Output() readonly editModeRequested = new EventEmitter<void>();
  @Output() readonly saveRequested = new EventEmitter<void>();
  @Output() readonly cancelRequested = new EventEmitter<void>();
  @Output() readonly undoRequested = new EventEmitter<void>();
  @Output() readonly redoRequested = new EventEmitter<void>();
  @Output() readonly addRequested = new EventEmitter<void>();
  @Output() readonly filterChanged = new EventEmitter<boolean>();
}
