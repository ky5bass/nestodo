import { HttpClient } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';

import { TaskDetail } from '../task-detail/task-detail.model';
import { TaskTreeNode } from './task-list.model';

@Injectable({ providedIn: 'root' })
export class TaskListService {
  readonly tasks = signal<TaskTreeNode[]>([]);
  readonly selectedTask = signal<TaskDetail | null>(null);
  readonly selectedTaskId = computed(() => this.selectedTask()?.id ?? null);
  readonly isPanelOpen = signal(false);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  constructor(private readonly http: HttpClient) {}

  loadTasks(filtered = true): void {
    this.loading.set(true);
    const tzOffset = new Date().getTimezoneOffset();
    this.http.get<TaskTreeNode[]>(`/api/tasks?filtered=${filtered}&tz_offset=${tzOffset}`).subscribe({
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

  updateTaskLocally(taskId: string, field: string, value: unknown): void {
    this.patchTaskLocally(taskId, { [field]: value } as Partial<TaskTreeNode>);
  }

  rollbackTaskLocally(taskId: string, field: string, previousValue: unknown): void {
    this.patchTaskLocally(taskId, { [field]: previousValue } as Partial<TaskTreeNode>);
  }

  mergeTaskLocally(task: TaskDetail): void {
    const taskFields = { ...task } as Partial<TaskTreeNode>;
    delete taskFields.children;
    this.patchTaskLocally(task.id, taskFields);
  }

  private patchTaskLocally(taskId: string, patch: Partial<TaskTreeNode>): void {
    this.tasks.update((tasks) => this.patchTree(tasks, taskId, patch));
    const selected = this.selectedTask();
    if (selected?.id === taskId) {
      this.selectedTask.set({ ...selected, ...patch });
    }
  }

  private patchTree(
    nodes: TaskTreeNode[],
    taskId: string,
    patch: Partial<TaskTreeNode>
  ): TaskTreeNode[] {
    let changed = false;
    const next = nodes.map((node) => {
      if (node.id === taskId) {
        changed = true;
        return { ...node, ...patch, children: patch.children ?? node.children };
      }
      const children = this.patchTree(node.children ?? [], taskId, patch);
      if (children !== node.children) {
        changed = true;
        return { ...node, children };
      }
      return node;
    });
    return changed ? next : nodes;
  }
}
