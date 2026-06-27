import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { TaskDetail } from '../task-detail/task-detail.model';
import { TaskTreeNode } from './task-list.model';
import { TaskListService } from './task-list.service';

function taskNode(overrides: Partial<TaskTreeNode> = {}): TaskTreeNode {
  return {
    id: 'task-1',
    parent_id: null,
    task_name: '一覧タスク',
    task_type: 'TODO',
    status: 'incomplete',
    progress: 20,
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
    task_contents: null,
    ...overrides
  };
}

function taskDetail(overrides: Partial<TaskDetail> = {}): TaskDetail {
  return {
    ...taskNode(),
    task_contents: {
      task_id: 'task-1',
      pre_info: null,
      notes: null,
      reflection: null
    },
    ...overrides
  };
}

describe('TaskListService', () => {
  let service: TaskListService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(TaskListService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('loadTasks() は filtered=true でタスク一覧を取得し、成功時に一覧へ反映する', () => {
    const tasks = [taskNode()];

    service.loadTasks();

    const request = http.expectOne((req) =>
      req.urlWithParams.startsWith('/api/tasks?filtered=true')
    );
    const params = new URLSearchParams(request.request.urlWithParams.split('?')[1]);
    expect(request.request.method).toBe('GET');
    expect(params.get('filtered')).toBe('true');
    request.flush(tasks);

    expect(service.tasks()).toEqual(tasks);
    expect(service.loading()).toBeFalse();
    expect(service.error()).toBeNull();
  });

  it('loadTasks() はエラー時に error シグナルへメッセージをセットする', () => {
    service.loadTasks();

    http
      .expectOne((req) => req.urlWithParams.startsWith('/api/tasks?filtered=true'))
      .flush({}, { status: 500, statusText: 'Server Error' });

    expect(service.loading()).toBeFalse();
    expect(service.error()).toBe('タスク一覧を取得できませんでした');
  });

  it('selectTask(taskId) は include_content=true で詳細を取得し、パネルを開く', () => {
    const task = taskDetail({ id: 'task-42', task_name: '詳細タスク' });

    service.selectTask('task-42');

    const request = http.expectOne('/api/tasks/task-42?include_content=true');
    expect(request.request.method).toBe('GET');
    request.flush(task);

    expect(service.selectedTask()).toEqual(task);
    expect(service.isPanelOpen()).toBeTrue();
    expect(service.error()).toBeNull();
  });

  it('selectTask(taskId) を同じタスクに対して 2 回呼ぶと closePanel() と同じ動作をする', () => {
    const task = taskDetail({ id: 'task-1' });

    service.selectTask('task-1');
    http.expectOne('/api/tasks/task-1?include_content=true').flush(task);

    service.selectTask('task-1');

    expect(service.selectedTask()).toBeNull();
    expect(service.isPanelOpen()).toBeFalse();
  });

  it('updateTaskLocally() と rollbackTaskLocally() は子孫タスクと選択中詳細へ反映する', () => {
    const child = taskNode({ id: 'child-1', task_name: '子', parent_id: 'task-1' });
    const root = taskNode({ children: [child] });
    service.tasks.set([root]);
    service.selectedTask.set(taskDetail({ id: 'child-1', task_name: '子' }));

    service.updateTaskLocally('child-1', 'task_name', '更新後');

    expect(service.tasks()[0].children[0].task_name).toBe('更新後');
    expect(service.selectedTask()?.task_name).toBe('更新後');

    service.rollbackTaskLocally('child-1', 'task_name', '子');

    expect(service.tasks()[0].children[0].task_name).toBe('子');
    expect(service.selectedTask()?.task_name).toBe('子');
  });
});
