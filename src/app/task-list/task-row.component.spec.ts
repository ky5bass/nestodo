import { ComponentFixture, TestBed } from '@angular/core/testing';
import * as fc from 'fast-check';

import { TaskRowComponent } from './task-row.component';
import { TaskTreeNode } from './task-list.model';

describe('TaskRowComponent', () => {
  let fixture: ComponentFixture<TaskRowComponent>;
  let component: TaskRowComponent;

  const createNode = (overrides: Partial<TaskTreeNode> = {}): TaskTreeNode => ({
    id: 'task-1',
    parent_id: null,
    task_name: '表示確認タスク',
    task_type: 'TODO',
    status: 'incomplete',
    progress: 35,
    priority: 'none',
    sort_order: 1,
    event_at: '2026-06-20T09:30:00',
    estimated_time: 90,
    actual_time: 25,
    preview: null,
    detail_flag: false,
    export_flag: true,
    last_done_at: null,
    created_at: '2026-06-20T00:00:00',
    updated_at: '2026-06-20T00:00:00',
    children: [],
    ...overrides
  });

  const render = (node: TaskTreeNode): HTMLElement => {
    fixture.componentRef.setInput('node', node);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaskRowComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TaskRowComponent);
    component = fixture.componentInstance;
  });

  it('タスク名・期限・予定時間・実績時間・進捗を表示する', () => {
    const element = render(createNode());

    expect(element.querySelector('strong')?.textContent?.trim()).toBe('表示確認タスク');
    expect(element.querySelector('.main-line span')?.textContent?.trim()).toBe('2026/06/20 09:30');
    expect(element.querySelector('.meta-line')?.textContent).toContain('予定 1h 30m');
    expect(element.querySelector('.meta-line')?.textContent).toContain('実績 25m');
    expect(element.querySelector('.meta-line')?.textContent).toContain('進捗 35%');
  });

  [
    { priority: 'none', className: 'priority-none', backgroundColor: 'rgb(255, 255, 255)' },
    { priority: 'priority', className: 'priority-priority', backgroundColor: 'rgb(255, 248, 207)' },
    { priority: 'highest', className: 'priority-highest', backgroundColor: 'rgb(255, 231, 225)' }
  ].forEach(({ priority, className, backgroundColor }) => {
    it(`優先度${priority}に対応する背景色を表示する`, () => {
      const element = render(createNode({ priority: priority as TaskTreeNode['priority'] }));
      const row = element.querySelector('.task-row') as HTMLElement;

      expect(row.classList).toContain(className);
      expect(getComputedStyle(row).backgroundColor).toBe(backgroundColor);
    });
  });

  it('previewが存在する場合はタスク名より小さい文字で表示する', () => {
    const element = render(createNode({ preview: 'プレビュー本文' }));
    const taskName = element.querySelector('strong') as HTMLElement;
    const preview = element.querySelector('p') as HTMLElement;

    expect(preview.textContent?.trim()).toBe('プレビュー本文');
    expect(parseFloat(getComputedStyle(preview).fontSize)).toBeLessThan(
      parseFloat(getComputedStyle(taskName).fontSize)
    );
  });

  [null, ''].forEach((preview) => {
    it(`previewが${preview === null ? 'null' : '空文字列'}の場合はプレビュー行を表示しない`, () => {
      const element = render(createNode({ preview }));

      expect(element.querySelector('p')).toBeNull();
    });
  });

  it('予定時間・実績時間が0の場合は0mと表示する', () => {
    expect(component.formatMinutes(0)).toBe('0m');
  });

  it('予定時間・実績時間がnullの場合は未入力として表示する', () => {
    expect(component.formatMinutes(null)).toBe('-');
  });

  it('Property 9: formatMinutesの0値・null値の区別', () => {
    fc.assert(
      fc.property(fc.oneof(fc.constant(null), fc.integer({ min: 0, max: 10000 })), (value) => {
        const actual = component.formatMinutes(value);

        if (value === null) {
          expect(actual).toBe('-');
          return;
        }
        if (value === 0) {
          expect(actual).toBe('0m');
          expect(actual).not.toBe(component.formatMinutes(null));
          return;
        }
        expect(actual).not.toBe('-');
      }),
      { numRuns: 100 }
    );
  });
});
