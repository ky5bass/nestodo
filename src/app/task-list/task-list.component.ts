import { Component, HostListener, OnInit, computed, inject } from '@angular/core';

import { TaskDetailPanelComponent } from '../task-detail/task-detail-panel.component';
import { DropTarget } from './edit-mode.model';
import { EditModeService } from './edit-mode.service';
import { EditModeToolbarComponent } from './edit-mode-toolbar.component';
import { HeaderComponent } from './header.component';
import { TaskListService } from './task-list.service';
import { TaskTreeNode } from './task-list.model';
import { TaskRowComponent } from './task-row.component';

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [HeaderComponent, TaskDetailPanelComponent, TaskRowComponent, EditModeToolbarComponent],
  template: `
    <app-header />
    <main class="task-list-page">
      <section class="task-list" aria-label="タスク一覧">
        <app-edit-mode-toolbar
          [isEditMode]="editMode.isEditMode()"
          [hasChanges]="editMode.hasChanges()"
          [canUndo]="editMode.canUndo()"
          [canRedo]="editMode.canRedo()"
          [filterDisabled]="editMode.filterDisabled()"
          [saving]="editMode.saving()"
          (editModeRequested)="enterEditMode()"
          (saveRequested)="saveEditMode()"
          (cancelRequested)="cancelEditMode()"
          (undoRequested)="editMode.undo()"
          (redoRequested)="editMode.redo()"
          (addRequested)="addRootTask()"
          (filterChanged)="setFilterDisabled($event)"
        />
        @if (service.error(); as error) {
          <p class="error-message">{{ error }}</p>
        }
        @if (editMode.error(); as error) {
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
              [isEditMode]="editMode.isEditMode()"
              [draggedTaskId]="draggedTaskId"
              (selected)="service.selectTask($event)"
              (rename)="editMode.renameTask($event.task, $event.name)"
              (deleteRequested)="deleteTask($event)"
              (dragStarted)="draggedTaskId = $event"
              (dropped)="moveTask($event)"
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
  readonly editMode = inject(EditModeService);
  readonly editedTasks = computed(() => this.editMode.buildEditedTree(this.service.tasks()));
  readonly flattenedTasks = computed(() =>
    this.flatten(this.editMode.isEditMode() ? this.editedTasks() : this.service.tasks())
  );
  draggedTaskId: string | null = null;

  ngOnInit(): void {
    this.service.loadTasks();
  }

  @HostListener('document:keydown.escape')
  closeOnEscape(): void {
    this.service.closePanel();
  }

  @HostListener('document:keydown', ['$event'])
  handleHistoryShortcuts(event: KeyboardEvent): void {
    if (!this.editMode.isEditMode()) {
      return;
    }
    const modifier = event.metaKey || event.ctrlKey;
    if (!modifier || event.key.toLowerCase() !== 'z') {
      return;
    }
    event.preventDefault();
    if (event.shiftKey) {
      this.editMode.redo();
    } else {
      this.editMode.undo();
    }
  }

  enterEditMode(): void {
    this.editMode.enterEditMode();
  }

  cancelEditMode(): void {
    if (this.editMode.hasChanges() && !confirm('未保存の変更を破棄しますか？')) {
      return;
    }
    this.editMode.cancel();
    this.service.loadTasks();
  }

  saveEditMode(): void {
    this.editMode.save().subscribe({
      next: () => this.service.loadTasks(),
      error: () => {
        // エラー表示はEditModeServiceが保持し、編集状態は維持する。
      }
    });
  }

  setFilterDisabled(disabled: boolean): void {
    this.editMode.setFilterDisabled(disabled);
    this.service.loadTasks(!disabled);
  }

  addRootTask(): void {
    const name = prompt('追加するタスク名');
    if (name === null) {
      return;
    }
    this.editMode.createRootTask(this.service.tasks(), name);
  }

  deleteTask(task: TaskTreeNode): void {
    if (!confirm('このタスクと子孫タスクを削除しますか？')) {
      return;
    }
    this.editMode.deleteTask(task);
  }

  moveTask(drop: DropTarget): void {
    const dragged = this.flattenedTasks().find((item) => item.node.id === drop.draggedId)?.node;
    let eventAt: string | undefined;
    if (drop.position !== 'inside') {
      const target = this.flattenedTasks().find((item) => item.node.id === drop.targetId)?.node;
      if (target?.parent_id === null && dragged?.event_at === null) {
        const input = prompt('ルートへ移動する日時を入力してください（例: 2026-05-31T09:00）');
        if (!input) {
          return;
        }
        eventAt = new Date(input).toISOString();
      }
    }
    this.editMode.moveTask(this.service.tasks(), drop, eventAt);
    this.draggedTaskId = null;
  }

  private flatten(nodes: TaskTreeNode[], depth = 0): { node: TaskTreeNode; depth: number }[] {
    return nodes.flatMap((node) => [
      { node, depth },
      ...this.flatten(node.children ?? [], depth + 1)
    ]);
  }
}
