import { Component, HostListener, OnInit, computed, inject } from '@angular/core';

import { TaskDetailPanelComponent } from '../task-detail/task-detail-panel.component';
import { HeaderComponent } from './header.component';
import { TaskListService } from './task-list.service';
import { TaskTreeNode } from './task-list.model';
import { TaskRowComponent } from './task-row.component';

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [HeaderComponent, TaskDetailPanelComponent, TaskRowComponent],
  template: `
    <app-header />
    <main class="task-list-page">
      <section class="task-list" aria-label="タスク一覧">
        @if (service.error(); as error) {
          <p class="error-message">{{ error }}</p>
        }
        @if (service.loading()) {
          <p class="empty-message">読み込み中...</p>
        } @else if (flattenedTasks().length === 0) {
          <p class="empty-message">表示するタスクはありません。</p>
        } @else {
          @for (item of flattenedTasks(); track item.node.id) {
            <app-task-row
              [node]="item.node"
              [depth]="item.depth"
              [selectedTaskId]="service.selectedTask()?.id ?? null"
              (selected)="service.selectTask($event)"
            />
          }
        }
      </section>
    </main>
    @if (service.isPanelOpen()) {
      <app-task-detail-panel [task]="service.selectedTask()" (close)="service.closePanel()" />
    }
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
        padding: 24px 16px 64px;
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

      .error-message {
        background: #fff0ed;
        border: 1px solid #e5b2a7;
        border-radius: 6px;
        color: #76231d;
        margin: 0 0 12px;
        padding: 10px;
      }

      app-task-row + app-task-row {
        display: block;
        margin-top: 8px;
      }
    `
  ]
})
export class TaskListComponent implements OnInit {
  readonly service = inject(TaskListService);
  readonly flattenedTasks = computed(() => this.flatten(this.service.tasks()));

  ngOnInit(): void {
    this.service.loadTasks();
  }

  @HostListener('document:keydown.escape')
  closeOnEscape(): void {
    this.service.closePanel();
  }

  private flatten(nodes: TaskTreeNode[], depth = 0): { node: TaskTreeNode; depth: number }[] {
    return nodes.flatMap((node) => [
      { node, depth },
      ...this.flatten(node.children ?? [], depth + 1)
    ]);
  }
}
