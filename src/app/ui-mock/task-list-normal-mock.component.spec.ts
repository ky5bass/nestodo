/// <reference types="jasmine" />

import { fakeAsync, TestBed, tick } from '@angular/core/testing';

import { TaskListNormalMockComponent } from './task-list-normal-mock.component';

describe('TaskListNormalMockComponent', () => {
  it('日時ポップオーバーを設定済みの時分へ初期配置する', fakeAsync(() => {
    TestBed.configureTestingModule({ imports: [TaskListNormalMockComponent] });
    const fixture = TestBed.createComponent(TaskListNormalMockComponent);
    const component = fixture.componentInstance;
    const task = component.tasks.find((candidate) => candidate.id === 'todo-a1-1-1');
    expect(task).toBeDefined();
    if (!task) {
      return;
    }
    task.eventAt = '2026-07-16T18:35';
    component.selectedTaskId = task.id;
    fixture.detectChanges();

    const trigger = fixture.nativeElement.querySelector('.date-time-trigger') as HTMLButtonElement;
    trigger.click();
    fixture.detectChanges();
    tick();

    const drums = Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('.time-drum'));
    const visibleOptions = drums.map((drum) =>
      Array.from<HTMLButtonElement>(drum.querySelectorAll('button')).map((option) => option.textContent?.trim())
    );
    const selectedOptions = drums.map((drum) => drum.querySelector<HTMLButtonElement>('button.selected'));

    expect(visibleOptions).toEqual([
      ['16', '17', '18', '19', '20'],
      ['25', '30', '35', '40', '45']
    ]);
    expect(selectedOptions.map((option) => option?.textContent?.trim())).toEqual(['18', '35']);
    expect(selectedOptions.every((option) => option?.parentElement?.children.item(2) === option)).toBeTrue();
  }));
});
