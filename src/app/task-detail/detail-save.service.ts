import { HttpClient } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { Observable, Subscription, timer } from 'rxjs';

import { TaskContentField, TaskDetail, TaskUpdateResult } from './task-detail.model';

export interface SaveOptions {
  update_last_done?: boolean;
  tz_offset?: number;
}

type SaveKind = 'field' | 'content';

interface PendingSave {
  taskId: string;
  field: string;
  kind: SaveKind;
  value: unknown;
  previous: TaskDetail | null;
  options?: SaveOptions;
}

interface SaveError {
  taskId: string;
  field: string;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class DetailSaveService {
  private readonly tasksById = signal<Record<string, TaskDetail>>({});
  private readonly pending = new Map<string, PendingSave>();
  private readonly timers = new Map<string, Subscription>();

  readonly selectedTaskId = signal<string | null>(null);
  readonly error = signal<SaveError | null>(null);
  readonly selectedTask = computed(() => {
    const taskId = this.selectedTaskId();
    return taskId ? (this.tasksById()[taskId] ?? null) : null;
  });

  constructor(private readonly http: HttpClient) {}

  setTask(task: TaskDetail): void {
    this.tasksById.update((tasks) => ({ ...tasks, [task.id]: this.normalizeTask(task) }));
  }

  selectTask(task: TaskDetail | null): void {
    if (task === null) {
      this.selectedTaskId.set(null);
      return;
    }
    this.setTask(task);
    this.selectedTaskId.set(task.id);
  }

  saveField(taskId: string, field: string, value: unknown, options?: SaveOptions): void {
    const previous = this.snapshot(taskId);
    this.patchTask(taskId, { [field]: value });
    const save: PendingSave = { taskId, field, kind: 'field', value, previous, options };
    this.schedule(save);
  }

  saveFields(taskId: string, values: Partial<TaskDetail>, options?: SaveOptions): void {
    const previous = this.snapshot(taskId);
    this.patchTask(taskId, values);
    const save: PendingSave = {
      taskId,
      field: Object.keys(values).sort().join('+'),
      kind: 'field',
      value: values,
      previous,
      options
    };
    this.schedule(save);
  }

  saveContent(taskId: string, field: TaskContentField, value: string): void {
    const previous = this.snapshot(taskId);
    const current = previous?.task_contents ?? {
      task_id: taskId,
      pre_info: null,
      notes: null,
      reflection: null
    };
    this.patchTask(taskId, {
      task_contents: {
        ...current,
        [field]: value
      }
    });
    const save: PendingSave = { taskId, field, kind: 'content', value, previous };
    this.schedule(save);
  }

  retry(taskId: string, field: string): void {
    const save = this.pending.get(this.key(taskId, field));
    if (save) {
      this.send(save);
    }
  }

  clearError(): void {
    this.error.set(null);
  }

  private schedule(save: PendingSave): void {
    const key = this.key(save.taskId, save.field);
    this.pending.set(key, save);
    this.timers.get(key)?.unsubscribe();
    this.timers.set(
      key,
      timer(300).subscribe(() => {
        this.send(save);
      })
    );
  }

  private send(save: PendingSave): void {
    const key = this.key(save.taskId, save.field);
    const request =
      save.kind === 'content'
        ? this.http.put<TaskDetail>(`/api/tasks/${save.taskId}/content`, this.contentBody(save))
        : this.http.put<TaskUpdateResult>(`/api/tasks/${save.taskId}`, this.fieldBody(save));

    (request as Observable<TaskDetail | TaskUpdateResult>).subscribe({
        next: (response: TaskDetail | TaskUpdateResult) => {
          if (save.kind === 'content') {
            this.setTask(response as TaskDetail);
          } else {
            const result = response as TaskUpdateResult;
            if (result.task) {
              this.setTask(result.task);
            }
          }
          this.pending.delete(key);
          this.error.set(null);
        },
        error: () => {
          this.rollback(save);
          this.error.set({
            taskId: save.taskId,
            field: save.field,
            message: '保存に失敗しました'
          });
        }
      });
  }

  private fieldBody(save: PendingSave): Record<string, unknown> {
    const values =
      save.value && typeof save.value === 'object' && !Array.isArray(save.value)
        ? (save.value as Record<string, unknown>)
        : { [save.field]: save.value };
    return { ...values, ...(save.options ?? {}) };
  }

  private contentBody(save: PendingSave): Record<TaskContentField, string | null> {
    const task = this.tasksById()[save.taskId];
    const content = task?.task_contents ?? {
      pre_info: null,
      notes: null,
      reflection: null
    };
    return {
      pre_info: content.pre_info,
      notes: content.notes,
      reflection: content.reflection
    };
  }

  private rollback(save: PendingSave): void {
    if (!save.previous) {
      return;
    }
    this.tasksById.update((tasks) => ({ ...tasks, [save.taskId]: save.previous as TaskDetail }));
  }

  private snapshot(taskId: string): TaskDetail | null {
    const task = this.tasksById()[taskId];
    return task ? structuredClone(task) : null;
  }

  private patchTask(taskId: string, patch: Partial<TaskDetail>): void {
    this.tasksById.update((tasks) => {
      const task = tasks[taskId];
      if (!task) {
        return tasks;
      }
      return { ...tasks, [taskId]: { ...task, ...patch } };
    });
  }

  private normalizeTask(task: TaskDetail): TaskDetail {
    return {
      ...task,
      children: task.children ?? [],
      task_contents: task.task_contents ?? {
        task_id: task.id,
        pre_info: null,
        notes: null,
        reflection: null
      }
    };
  }

  private key(taskId: string, field: string): string {
    return `${taskId}:${field}`;
  }
}
