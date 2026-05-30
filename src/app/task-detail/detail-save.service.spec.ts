import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import * as fc from 'fast-check';

import { DetailSaveService } from './detail-save.service';
import { TaskDetail } from './task-detail.model';

function task(overrides: Partial<TaskDetail> = {}): TaskDetail {
  return {
    id: 'task-1',
    parent_id: null,
    task_name: '初期タスク',
    task_type: 'TODO',
    status: 'incomplete',
    progress: 0,
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
    task_contents: {
      task_id: 'task-1',
      pre_info: null,
      notes: null,
      reflection: null
    },
    ...overrides
  };
}

describe('DetailSaveService', () => {
  let service: DetailSaveService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(DetailSaveService);
    http = TestBed.inject(HttpTestingController);
    service.selectTask(task());
  });

  afterEach(() => {
    http.verify();
  });

  it('Property 3: Optimistic UIの整合性', fakeAsync(() => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 30 }), (name) => {
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
          providers: [provideHttpClient(), provideHttpClientTesting()]
        });
        const localService = TestBed.inject(DetailSaveService);
        const localHttp = TestBed.inject(HttpTestingController);
        localService.selectTask(task());

        localService.saveField('task-1', 'task_name', name);
        expect(localService.selectedTask()?.task_name).toBe(name);
        tick(300);
        localHttp.expectOne('/api/tasks/task-1').flush({
          type: 'updated',
          task: task({ task_name: name })
        });
        expect(localService.selectedTask()?.task_name).toBe(name);
        localHttp.verify();
      }),
      { numRuns: 100 }
    );
  }));

  it('保存エラー時は編集前の値へロールバックする', fakeAsync(() => {
    service.saveField('task-1', 'task_name', '失敗する変更');
    expect(service.selectedTask()?.task_name).toBe('失敗する変更');

    tick(300);
    http.expectOne('/api/tasks/task-1').flush({}, { status: 500, statusText: 'Server Error' });

    expect(service.selectedTask()?.task_name).toBe('初期タスク');
    expect(service.error()?.field).toBe('task_name');
  }));

  it('Property 4: デバウンスは最新値のみ送信', fakeAsync(() => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 2, maxLength: 8 }),
        (names) => {
          TestBed.resetTestingModule();
          TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting()]
          });
          const localService = TestBed.inject(DetailSaveService);
          const localHttp = TestBed.inject(HttpTestingController);
          localService.selectTask(task());

          names.forEach((name) => {
            localService.saveField('task-1', 'task_name', name);
            tick(100);
          });
          tick(300);

          const request = localHttp.expectOne('/api/tasks/task-1');
          expect(request.request.body.task_name).toBe(names[names.length - 1]);
          request.flush({
            type: 'updated',
            task: task({ task_name: names[names.length - 1] })
          });
          localHttp.verify();
        }
      ),
      { numRuns: 100 }
    );
  }));
});
