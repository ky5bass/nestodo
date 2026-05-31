import { ComponentFixture, TestBed } from '@angular/core/testing';
import * as fc from 'fast-check';

import { BatchCompletionModalComponent } from './batch-completion-modal.component';
import { BatchCompletionModalData, PendingChild } from './task-detail.model';

function child(index: number): PendingChild {
  return {
    id: `child-${index}`,
    task_name: `子タスク${index}`,
    status: 'incomplete'
  };
}

describe('BatchCompletionModalComponent', () => {
  let fixture: ComponentFixture<BatchCompletionModalComponent>;
  let component: BatchCompletionModalComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BatchCompletionModalComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(BatchCompletionModalComponent);
    component = fixture.componentInstance;
  });

  it('確認メッセージと操作ボタンを表示する', () => {
    component.open = true;
    component.data = {
      taskName: '親タスク',
      pendingChildren: [child(1)]
    };
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('子孫タスクも一括で完了しますか？');
    expect(text).toContain('一括完了');
    expect(text).toContain('キャンセル');
  });

  it('Property 3: 未完了子孫リストの表示とトランケーション', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 50 }), (length) => {
        const children = Array.from({ length }, (_, index) => child(index + 1));
        const data: BatchCompletionModalData = {
          taskName: '親タスク',
          pendingChildren: children
        };

        component.open = true;
        component.data = data;
        fixture.detectChanges();

        expect(component.displayedChildren().length).toBe(Math.min(length, 10));
        expect(component.remainingCount()).toBe(Math.max(length - 10, 0));
      }),
      { numRuns: 100 }
    );
  });

  it('ローディング中はキャンセル操作を無効化する', () => {
    let cancelled = false;
    component.open = true;
    component.loading = true;
    component.data = {
      taskName: '親タスク',
      pendingChildren: [child(1)]
    };
    component.cancelled.subscribe(() => {
      cancelled = true;
    });

    component.cancel();

    expect(cancelled).toBeFalse();
  });
});
