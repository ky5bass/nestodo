import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-status-toggle',
  standalone: true,
  template: `
    <label class="switch-row">
      <span>ステータス</span>
      <button
        type="button"
        class="switch"
        [class.complete]="isComplete"
        [attr.aria-pressed]="isComplete"
        (click)="toggle.emit(!isComplete)"
      >
        <span class="thumb"></span>
      </button>
      <strong>{{ isComplete ? '完了' : '未完了' }}</strong>
    </label>
  `,
  styles: [
    `
      .switch-row {
        align-items: center;
        display: grid;
        gap: 10px;
        grid-template-columns: 72px 54px 1fr;
      }

      span,
      strong {
        color: #344240;
        font-size: 0.9rem;
      }

      .switch {
        background: #c7d1cf;
        border: 0;
        border-radius: 999px;
        cursor: pointer;
        height: 30px;
        padding: 3px;
        position: relative;
        width: 54px;
      }

      .switch.complete {
        background: #1f6f68;
      }

      .thumb {
        background: #ffffff;
        border-radius: 999px;
        display: block;
        height: 24px;
        transform: translateX(0);
        transition: transform 140ms ease;
        width: 24px;
      }

      .complete .thumb {
        transform: translateX(24px);
      }
    `
  ]
})
export class StatusToggleComponent {
  @Input() isComplete = false;
  @Output() readonly toggle = new EventEmitter<boolean>();
}
