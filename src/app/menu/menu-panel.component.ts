import { Component, ElementRef, HostListener, inject } from '@angular/core';
import { Router } from '@angular/router';

import { NAV_ITEMS, NavItem } from './menu.model';
import { MenuService } from './menu.service';

@Component({
  selector: 'app-menu-panel',
  standalone: true,
  template: `
    <nav id="main-navigation" class="menu-panel" aria-label="メインナビゲーション">
      <ul class="menu-list">
        @for (item of navItems; track item.path) {
          <li>
            <a class="menu-link" [href]="item.path" (click)="navigate($event, item)">
              {{ item.label }}
            </a>
          </li>
        }
      </ul>
    </nav>
  `,
  styles: [
    `
      :host {
        display: block;
        left: 0;
        position: absolute;
        top: calc(100% + 8px);
        z-index: 20;
      }

      .menu-panel {
        background: #ffffff;
        border: 1px solid #c8d0cf;
        border-radius: 8px;
        box-shadow: 0 12px 28px rgb(20 32 32 / 16%);
        min-width: 184px;
        padding: 6px;
      }

      .menu-list {
        list-style: none;
        margin: 0;
        padding: 0;
      }

      .menu-link {
        border-radius: 6px;
        color: #1d2525;
        display: block;
        padding: 10px 12px;
        text-decoration: none;
        white-space: nowrap;
      }

      .menu-link:hover,
      .menu-link:focus-visible {
        background: #eef5f3;
        outline: none;
      }
    `
  ]
})
export class MenuPanelComponent {
  readonly navItems: readonly NavItem[] = NAV_ITEMS;

  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly menuService = inject(MenuService);
  private readonly router = inject(Router);

  @HostListener('document:keydown.escape')
  closeOnEscape(): void {
    this.menuService.close();
  }

  @HostListener('document:click', ['$event'])
  closeOnOutsideClick(event: MouseEvent): void {
    const target = event.target;
    const parent = this.elementRef.nativeElement.parentElement;
    const boundary =
      parent?.classList.contains('menu-shell') === true ? parent : this.elementRef.nativeElement;

    if (target instanceof Node && !boundary.contains(target)) {
      this.menuService.close();
    }
  }

  navigate(event: MouseEvent, item: NavItem): void {
    event.preventDefault();

    void this.router.navigateByUrl(item.path).finally(() => {
      this.menuService.close();
    });
  }
}
