import { Component, inject } from '@angular/core';

import { MenuPanelComponent } from './menu-panel.component';
import { MenuService } from './menu.service';

@Component({
  selector: 'app-menu-button',
  standalone: true,
  imports: [MenuPanelComponent],
  template: `
    <div class="menu-shell">
      <button
        type="button"
        class="menu-button"
        aria-label="メニュー"
        [attr.aria-expanded]="menuService.isOpen()"
        aria-controls="main-navigation"
        (click)="menuService.toggle()"
      >
        <span class="menu-line" aria-hidden="true"></span>
        <span class="menu-line" aria-hidden="true"></span>
        <span class="menu-line" aria-hidden="true"></span>
      </button>

      @if (menuService.isOpen()) {
        <app-menu-panel />
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: inline-block;
        position: relative;
      }

      .menu-shell {
        position: relative;
      }

      .menu-button {
        align-items: center;
        background: #ffffff;
        border: 1px solid #c8d0cf;
        border-radius: 6px;
        cursor: pointer;
        display: inline-flex;
        flex-direction: column;
        gap: 4px;
        height: 40px;
        justify-content: center;
        padding: 0;
        width: 40px;
      }

      .menu-button:hover {
        background: #eef5f3;
      }

      .menu-button:focus-visible {
        outline: 3px solid #2f7f7a;
        outline-offset: 2px;
      }

      .menu-line {
        background: #1d2525;
        border-radius: 999px;
        display: block;
        height: 2px;
        width: 18px;
      }
    `
  ]
})
export class MenuButtonComponent {
  protected readonly menuService = inject(MenuService);
}
