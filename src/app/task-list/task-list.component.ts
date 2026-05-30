import { Component } from '@angular/core';

import { HeaderComponent } from './header.component';

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [HeaderComponent],
  template: `
    <app-header />
    <main class="task-list-page">
      <section class="task-list" aria-label="タスク一覧">
        <p class="empty-message">表示するタスクはありません。</p>
      </section>
    </main>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100vh;
      }

      .task-list-page {
        margin: 0 auto;
        max-width: 960px;
        padding: 24px 16px;
      }

      .task-list {
        background: #ffffff;
        border: 1px solid #d7dddc;
        border-radius: 8px;
        padding: 24px;
      }

      .empty-message {
        color: #60706f;
        margin: 0;
      }
    `
  ]
})
export class TaskListComponent {}
