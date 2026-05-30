import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';

import { TaskDetail } from '../task-detail/task-detail.model';
import { TaskTreeNode } from './task-list.model';

@Injectable({ providedIn: 'root' })
export class TaskListService {
  readonly tasks = signal<TaskTreeNode[]>([]);
  readonly selectedTask = signal<TaskDetail | null>(null);
  readonly isPanelOpen = signal(false);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  constructor(private readonly http: HttpClient) {}

  loadTasks(): void {
    this.loading.set(true);
    const tzOffset = new Date().getTimezoneOffset();
    this.http.get<TaskTreeNode[]>(`/api/tasks?filtered=true&tz_offset=${tzOffset}`).subscribe({
      next: (tasks) => {
        this.tasks.set(tasks);
        this.loading.set(false);
        this.error.set(null);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('タスク一覧を取得できませんでした');
      }
    });
  }

  selectTask(taskId: string): void {
    if (this.selectedTask()?.id === taskId && this.isPanelOpen()) {
      this.closePanel();
      return;
    }
    this.http.get<TaskDetail>(`/api/tasks/${taskId}?include_content=true`).subscribe({
      next: (task) => {
        this.selectedTask.set(task);
        this.isPanelOpen.set(true);
        this.error.set(null);
      },
      error: () => {
        this.error.set('タスク詳細を取得できませんでした');
      }
    });
  }

  closePanel(): void {
    this.isPanelOpen.set(false);
    this.selectedTask.set(null);
  }
}
