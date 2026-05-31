import { HttpClient } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { TaskTreeNode } from './task-list.model';
import { BatchOperation, DropTarget, EditOperation } from './edit-mode.model';
import { SortOrderCalculator } from './sort-order-calculator';

@Injectable({ providedIn: 'root' })
export class EditModeService {
  readonly isEditMode = signal(false);
  readonly changeBuffer = signal<EditOperation[]>([]);
  readonly undoStack = signal<EditOperation[]>([]);
  readonly redoStack = signal<EditOperation[]>([]);
  readonly filterDisabled = signal(false);
  readonly error = signal<string | null>(null);
  readonly saving = signal(false);

  readonly hasChanges = computed(() => this.changeBuffer().length > 0);
  readonly canUndo = computed(() => this.undoStack().length > 0);
  readonly canRedo = computed(() => this.redoStack().length > 0);

  readonly deletedTaskIds = computed(() => {
    const ids = new Set<string>();
    for (const op of this.changeBuffer()) {
      if (op.type === 'delete') {
        ids.add(op.taskId);
        op.descendants.forEach((id) => ids.add(id));
      }
    }
    return ids;
  });

  constructor(private readonly http: HttpClient) {}

  enterEditMode(): void {
    this.isEditMode.set(true);
    this.filterDisabled.set(false);
    this.error.set(null);
  }

  exitEditMode(): void {
    this.isEditMode.set(false);
    this.changeBuffer.set([]);
    this.undoStack.set([]);
    this.redoStack.set([]);
    this.filterDisabled.set(false);
    this.error.set(null);
  }

  cancel(): void {
    this.exitEditMode();
  }

  setFilterDisabled(disabled: boolean): void {
    this.filterDisabled.set(disabled);
  }

  renameTask(task: TaskTreeNode, newName: string): boolean {
    const name = newName.trim();
    if (name.length === 0 || name.length > 255) {
      this.error.set('タスク名は1〜255文字で入力してください');
      return false;
    }
    if (name === task.task_name) {
      return true;
    }
    this.applyOperation({
      type: 'rename',
      taskId: task.id,
      oldName: task.task_name,
      newName: name
    });
    return true;
  }

  createRootTask(tasks: TaskTreeNode[], name: string): boolean {
    const trimmed = name.trim();
    if (trimmed.length === 0 || trimmed.length > 255) {
      this.error.set('タスク名は1〜255文字で入力してください');
      return false;
    }
    const roots = this.buildEditedTree(tasks);
    const last = roots.at(-1);
    const sortOrder = last ? SortOrderCalculator.appendToEnd(last.sort_order) : 1.0;
    const eventAt = this.defaultRootEventAt();
    this.applyOperation({
      type: 'create',
      tempId: `tmp-${crypto.randomUUID()}`,
      name: trimmed,
      parentId: null,
      sortOrder,
      taskType: 'TODO',
      eventAt
    });
    return true;
  }

  deleteTask(task: TaskTreeNode): void {
    this.applyOperation({
      type: 'delete',
      taskId: task.id,
      descendants: this.collectDescendantIds(task)
    });
  }

  moveTask(tasks: TaskTreeNode[], drop: DropTarget, eventAt?: string): boolean {
    const edited = this.buildEditedTree(tasks);
    const nodes = this.flatten(edited);
    const dragged = nodes.find((item) => item.node.id === drop.draggedId);
    const target = nodes.find((item) => item.node.id === drop.targetId);
    if (!dragged || !target || dragged.node.id === target.node.id) {
      return false;
    }
    if (this.isDescendantOf(target.node.id, dragged.node.id, edited)) {
      this.error.set('子孫タスクへ移動できません');
      return false;
    }

    const newParentId = drop.position === 'inside' ? target.node.id : target.node.parent_id;
    const newDepth = drop.position === 'inside' ? target.depth + 1 : target.depth;
    if (newDepth + this.maxSubtreeDepth(dragged.node) > 10) {
      this.error.set('階層は最大10レベルまでです');
      return false;
    }
    if (newParentId === null && dragged.node.event_at === null && !eventAt) {
      this.error.set('ルートへ移動する場合はevent_atが必要です');
      return false;
    }

    const siblings = this.siblingsForDrop(edited, dragged.node.id, target.node.id, newParentId);
    const insertIndex = this.insertIndex(siblings, drop.targetId, drop.position);
    const prev = siblings[insertIndex - 1] ?? null;
    const next = siblings[insertIndex] ?? null;
    let newSortOrder = 1.0;
    let rebalanced: { id: string; sortOrder: number }[] | undefined;
    if (prev && next) {
      if (SortOrderCalculator.needsRebalance(prev.sort_order, next.sort_order)) {
        const rebalancedSiblings = SortOrderCalculator.rebalance([
          ...siblings,
          { ...dragged.node, sort_order: SortOrderCalculator.midpoint(prev.sort_order, next.sort_order) }
        ]);
        const moved = rebalancedSiblings.find((item) => item.id === dragged.node.id);
        newSortOrder = moved?.sort_order ?? 1.0;
        rebalanced = rebalancedSiblings.map((item) => ({
          id: item.id,
          sortOrder: item.sort_order
        }));
      } else {
        newSortOrder = SortOrderCalculator.midpoint(prev.sort_order, next.sort_order);
      }
    } else if (prev) {
      newSortOrder = SortOrderCalculator.appendToEnd(prev.sort_order);
    } else if (next) {
      newSortOrder = SortOrderCalculator.prependToHead(next.sort_order);
    }

    this.applyOperation({
      type: 'move',
      taskId: dragged.node.id,
      oldParentId: dragged.node.parent_id,
      oldSortOrder: dragged.node.sort_order,
      newParentId,
      newSortOrder,
      eventAt,
      rebalanced
    });
    return true;
  }

  applyOperation(op: EditOperation): void {
    if (op.type === 'rename' && (op.newName.trim().length === 0 || op.newName.length > 255)) {
      this.error.set('タスク名は1〜255文字で入力してください');
      return;
    }
    this.changeBuffer.update((buffer) => [...buffer, op]);
    this.undoStack.update((stack) => [...stack, op]);
    this.redoStack.set([]);
    this.error.set(null);
  }

  undo(): void {
    const stack = this.undoStack();
    const op = stack.at(-1);
    if (!op) {
      return;
    }
    this.undoStack.set(stack.slice(0, -1));
    this.redoStack.update((redo) => [...redo, op]);
    this.changeBuffer.update((buffer) => buffer.slice(0, -1));
  }

  redo(): void {
    const stack = this.redoStack();
    const op = stack.at(-1);
    if (!op) {
      return;
    }
    this.redoStack.set(stack.slice(0, -1));
    this.undoStack.update((undo) => [...undo, op]);
    this.changeBuffer.update((buffer) => [...buffer, op]);
  }

  save(): Observable<void> {
    if (!this.hasChanges()) {
      this.exitEditMode();
      return new Observable<void>((subscriber) => {
        subscriber.next();
        subscriber.complete();
      });
    }
    this.saving.set(true);
    this.error.set(null);
    return this.http.patch<void>('/api/tasks/batch', this.toBatchOperations()).pipe(
      tap({
        next: () => {
          this.saving.set(false);
          this.exitEditMode();
        },
        error: () => {
          this.saving.set(false);
          this.error.set('一括保存に失敗しました');
        }
      })
    );
  }

  buildEditedTree(tasks: TaskTreeNode[]): TaskTreeNode[] {
    const deleted = this.deletedTaskIds();
    const clones = new Map<string, TaskTreeNode>();
    for (const item of this.flatten(tasks)) {
      if (!deleted.has(item.node.id)) {
        clones.set(item.node.id, { ...item.node, children: [] });
      }
    }
    for (const op of this.changeBuffer()) {
      if (op.type === 'rename') {
        const node = clones.get(op.taskId);
        if (node) {
          node.task_name = op.newName;
        }
      } else if (op.type === 'move') {
        const node = clones.get(op.taskId);
        if (node) {
          node.parent_id = op.newParentId;
          node.sort_order = op.newSortOrder;
          node.event_at = op.eventAt ?? node.event_at;
        }
        for (const item of op.rebalanced ?? []) {
          const sibling = clones.get(item.id);
          if (sibling) {
            sibling.sort_order = item.sortOrder;
          }
        }
      } else if (op.type === 'create') {
        clones.set(op.tempId, {
          id: op.tempId,
          parent_id: op.parentId,
          task_name: op.name,
          task_type: op.taskType,
          status: 'incomplete',
          progress: null,
          priority: 'none',
          sort_order: op.sortOrder,
          event_at: op.eventAt ?? null,
          estimated_time: null,
          actual_time: null,
          preview: null,
          detail_flag: false,
          export_flag: true,
          last_done_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          children: []
        });
      }
    }

    const roots: TaskTreeNode[] = [];
    for (const node of clones.values()) {
      const parent = node.parent_id ? clones.get(node.parent_id) : null;
      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    }
    this.sortTree(roots);
    return roots;
  }

  private toBatchOperations(): BatchOperation[] {
    return this.changeBuffer().map((op) => {
      if (op.type === 'rename') {
        return { type: 'rename', task_id: op.taskId, name: op.newName };
      }
      if (op.type === 'create') {
        return {
          type: 'create',
          name: op.name,
          new_parent_id: op.parentId,
          sort_order: op.sortOrder,
          task_type: op.taskType,
          event_at: op.eventAt
        };
      }
      if (op.type === 'delete') {
        return { type: 'delete', task_id: op.taskId, descendants: op.descendants };
      }
      return {
        type: 'move',
        task_id: op.taskId,
        new_parent_id: op.newParentId,
        sort_order: op.newSortOrder,
        event_at: op.eventAt
      };
    });
  }

  private collectDescendantIds(task: TaskTreeNode): string[] {
    return task.children.flatMap((child) => [child.id, ...this.collectDescendantIds(child)]);
  }

  private defaultRootEventAt(): string {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    return date.toISOString();
  }

  private flatten(nodes: TaskTreeNode[], depth = 0): { node: TaskTreeNode; depth: number }[] {
    return nodes.flatMap((node) => [
      { node, depth },
      ...this.flatten(node.children ?? [], depth + 1)
    ]);
  }

  private sortTree(nodes: TaskTreeNode[]): void {
    nodes.sort((left, right) => left.sort_order - right.sort_order);
    nodes.forEach((node) => this.sortTree(node.children));
  }

  private isDescendantOf(taskId: string, ancestorId: string, nodes: TaskTreeNode[]): boolean {
    const item = this.flatten(nodes).find((entry) => entry.node.id === ancestorId);
    return Boolean(item?.node.children.some((child) => child.id === taskId || this.isDescendantOf(taskId, child.id, nodes)));
  }

  private maxSubtreeDepth(node: TaskTreeNode): number {
    if (node.children.length === 0) {
      return 1;
    }
    return 1 + Math.max(...node.children.map((child) => this.maxSubtreeDepth(child)));
  }

  private siblingsForDrop(
    nodes: TaskTreeNode[],
    draggedId: string,
    targetId: string,
    parentId: string | null
  ): TaskTreeNode[] {
    const parent = parentId ? this.flatten(nodes).find((item) => item.node.id === parentId)?.node : null;
    const siblings = (parent ? parent.children : nodes).filter((node) => node.id !== draggedId);
    if (!siblings.some((node) => node.id === targetId)) {
      return siblings;
    }
    return siblings;
  }

  private insertIndex(
    siblings: TaskTreeNode[],
    targetId: string,
    position: 'before' | 'inside' | 'after'
  ): number {
    if (position === 'inside') {
      return siblings.length;
    }
    const index = siblings.findIndex((node) => node.id === targetId);
    if (index < 0) {
      return siblings.length;
    }
    return position === 'before' ? index : index + 1;
  }
}
