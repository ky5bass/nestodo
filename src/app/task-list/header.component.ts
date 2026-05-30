import { Component } from '@angular/core';

import { MenuButtonComponent } from '../menu/menu-button.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [MenuButtonComponent],
  template: `
    <header class="app-header">
      <app-menu-button />
      <h1>タスク一覧</h1>
    </header>
  `,
  styles: [
    `
      .app-header {
        align-items: center;
        background: #f7f7f4;
        border-bottom: 1px solid #d7dddc;
        display: flex;
        gap: 12px;
        min-height: 56px;
        padding: 8px 16px;
        position: sticky;
        top: 0;
        z-index: 10;
      }

      h1 {
        font-size: 1.25rem;
        font-weight: 700;
        letter-spacing: 0;
        line-height: 1.2;
        margin: 0;
      }
    `
  ]
})
export class HeaderComponent {}
