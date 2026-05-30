import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class MenuService {
  readonly isOpen = signal<boolean>(false);

  toggle(): void {
    this.isOpen.update((current) => !current);
  }

  close(): void {
    this.isOpen.set(false);
  }
}
