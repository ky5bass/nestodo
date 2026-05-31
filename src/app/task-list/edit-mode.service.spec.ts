import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { TaskTreeNode } from './task-list.model';
import { EditModeService } from './edit-mode.service';

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

  it('フィルター切替時にバッファを保持する', () => {
    service.renameTask(node(), 'renamed');

    service.setFilterDisabled(true);
    service.setFilterDisabled(false);

    expect(service.changeBuffer().length).toBe(1);
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
});
