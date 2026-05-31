import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { TaskTreeNode } from './task-list.model';
import { EditModeService } from './edit-mode.service';
import { EditOperation } from './edit-mode.model';

function node(overrides: Partial<TaskTreeNode> = {}): TaskTreeNode {
  return {
    id: 'task-1',
    parent_id: null,
    task_name: 'task',
    task_type: 'TODO',
    status: 'incomplete',
    progress: null,
    priority: 'none',
    sort_order: 1,
    event_at: '2026-05-31T00:00:00Z',
    estimated_time: null,
    actual_time: null,
    preview: null,
    detail_flag: false,
    export_flag: true,
    last_done_at: null,
    created_at: '2026-05-31T00:00:00Z',
    updated_at: '2026-05-31T00:00:00Z',
    children: [],
    ...overrides
  };
}

describe('EditModeService', () => {
  let service: EditModeService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(EditModeService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('Change_Bufferに有効なリネーム操作を記録する', () => {
    expect(service.renameTask(node(), 'renamed')).toBeTrue();

    expect(service.changeBuffer()[0]).toEqual(
      jasmine.objectContaining({ type: 'rename', taskId: 'task-1', newName: 'renamed' })
    );
    expect(service.hasChanges()).toBeTrue();
  });

  it('タスク名バリデーションで不正な値を拒否する', () => {
    expect(service.renameTask(node(), '')).toBeFalse();
    expect(service.renameTask(node(), 'a'.repeat(256))).toBeFalse();

    expect(service.changeBuffer()).toEqual([]);
  });

  it('子孫削除を単一操作としてUndo/Redoできる', () => {
    const tree = node({
      children: [
        node({
          id: 'child',
          parent_id: 'task-1',
          children: [node({ id: 'grandchild', parent_id: 'child' })]
        })
      ]
    });

    service.deleteTask(tree);
    expect(service.deletedTaskIds()).toEqual(new Set(['task-1', 'child', 'grandchild']));

    service.undo();
    expect(service.changeBuffer()).toEqual([]);
    expect(service.canRedo()).toBeTrue();

    service.redo();
    expect(service.deletedTaskIds()).toEqual(new Set(['task-1', 'child', 'grandchild']));
  });

  it('未保存タスクを削除するとcreate操作が除去されdelete操作は追加されない', () => {
    service.applyOperation({
      type: 'create',
      tempId: 'tmp-parent',
      name: 'draft',
      parentId: null,
      sortOrder: 1,
      taskType: 'TODO',
      eventAt: '2026-06-30T00:00:00Z'
    });
    service.applyOperation({
      type: 'rename',
      taskId: 'tmp-parent',
      oldName: 'draft',
      newName: 'renamed'
    });

    service.deleteTask(node({ id: 'tmp-parent', task_name: 'renamed' }));

    expect(service.changeBuffer()).toEqual([]);
    expect(service.undoStack()).toEqual([]);
  });

  it('未保存タスクの子孫も同時にバッファから除去される', () => {
    service.applyOperation({
      type: 'create',
      tempId: 'tmp-parent',
      name: 'parent',
      parentId: null,
      sortOrder: 1,
      taskType: 'TODO',
      eventAt: '2026-06-30T00:00:00Z'
    });
    service.applyOperation({
      type: 'create',
      tempId: 'tmp-child',
      name: 'child',
      parentId: 'tmp-parent',
      sortOrder: 1,
      taskType: 'TODO'
    });
    service.applyOperation({
      type: 'move',
      taskId: 'task-1',
      oldParentId: null,
      oldSortOrder: 1,
      newParentId: 'tmp-parent',
      newSortOrder: 2
    });

    service.deleteTask(node({ id: 'tmp-parent' }));

    expect(service.changeBuffer()).toEqual([]);
  });

  it('フィルター切替時にバッファを保持する', () => {
    service.renameTask(node(), 'renamed');

    service.setFilterDisabled(true);
    service.setFilterDisabled(false);

    expect(service.changeBuffer().length).toBe(1);
  });

  it('追加したルートタスクは通常フィルター範囲内のevent_atを持つ', () => {
    const before = new Date();

    expect(service.createRootTask([], 'new task')).toBeTrue();

    const operation = service.changeBuffer()[0] as Extract<EditOperation, { type: 'create' }>;
    const eventAt = new Date(operation.eventAt ?? '');
    const upper = new Date(before);
    upper.setMonth(upper.getMonth() + 1);
    upper.setMinutes(upper.getMinutes() + 1);

    expect(operation.parentId).toBeNull();
    expect(eventAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(eventAt.getTime()).toBeLessThanOrEqual(upper.getTime());
  });

  it('保存時にバッチAPIへ変換して成功後にモードを終了する', () => {
    service.enterEditMode();
    service.renameTask(node(), 'renamed');

    service.save().subscribe();

    const request = http.expectOne('/api/tasks/batch');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual([
      { type: 'rename', task_id: 'task-1', name: 'renamed' }
    ]);
    request.flush(null, { status: 204, statusText: 'No Content' });

    expect(service.isEditMode()).toBeFalse();
    expect(service.changeBuffer()).toEqual([]);
  });

  it('toBatchOperationsでtmpタスクをclient_idフィールドで送信する', () => {
    service.applyOperation({
      type: 'create',
      tempId: 'tmp-parent',
      name: 'parent',
      parentId: null,
      sortOrder: 1,
      taskType: 'TODO',
      eventAt: '2026-06-30T00:00:00Z'
    });
    service.applyOperation({
      type: 'create',
      tempId: 'tmp-child',
      name: 'child',
      parentId: 'tmp-parent',
      sortOrder: 1,
      taskType: 'TODO'
    });
    service.applyOperation({
      type: 'move',
      taskId: 'tmp-child',
      oldParentId: 'tmp-parent',
      oldSortOrder: 1,
      newParentId: 'tmp-parent',
      newSortOrder: 2
    });

    service.save().subscribe();

    const request = http.expectOne('/api/tasks/batch');
    expect(request.request.body).toEqual([
      {
        type: 'create',
        client_id: 'tmp-parent',
        name: 'parent',
        new_parent_id: null,
        sort_order: 1,
        task_type: 'TODO',
        event_at: '2026-06-30T00:00:00Z'
      },
      {
        type: 'create',
        client_id: 'tmp-child',
        name: 'child',
        new_parent_client_id: 'tmp-parent',
        sort_order: 1,
        task_type: 'TODO',
        event_at: undefined
      },
      {
        type: 'move',
        client_id: 'tmp-child',
        new_parent_client_id: 'tmp-parent',
        sort_order: 2,
        event_at: undefined
      }
    ]);
    request.flush(null, { status: 204, statusText: 'No Content' });
  });
});
