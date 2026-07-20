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

  it('予定工数は決定時だけ反映し、外側クリックでは下書きを破棄する', () => {
    TestBed.configureTestingModule({ imports: [TaskListNormalMockComponent] });
    const fixture = TestBed.createComponent(TaskListNormalMockComponent);
    const component = fixture.componentInstance;
    const task = component.tasks.find((candidate) => candidate.id === 'todo-a1-1-1');
    expect(task).toBeDefined();
    if (!task) {
      return;
    }
    component.selectedTaskId = task.id;
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;

    const estimatedTrigger = host.querySelectorAll<HTMLButtonElement>('.time-popover-trigger')[0];
    const estimatedUnit = estimatedTrigger.querySelector<HTMLElement>('.metric-unit');
    expect(getComputedStyle(estimatedTrigger).minWidth).toBe('184px');
    expect(estimatedUnit && getComputedStyle(estimatedUnit).alignSelf).toBe('baseline');
    expect(estimatedUnit && getComputedStyle(estimatedUnit).transform).toBe('matrix(1, 0, 0, 1, 0, 2)');
    estimatedTrigger.click();
    fixture.detectChanges();

    const hourInput = host.querySelectorAll<HTMLInputElement>('.time-popover .time-number')[1];
    hourInput.value = '4';
    hourInput.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(task.estimated).toBe('3時間');

    host.querySelector<HTMLElement>('.detail-top-row')?.click();
    fixture.detectChanges();
    expect(host.querySelector('.time-popover')).toBeNull();
    expect(task.estimated).toBe('3時間');

    estimatedTrigger.click();
    fixture.detectChanges();
    const reopenedHourInput = host.querySelectorAll<HTMLInputElement>('.time-popover .time-number')[1];
    reopenedHourInput.value = '4';
    reopenedHourInput.dispatchEvent(new Event('change'));
    host.querySelector<HTMLButtonElement>('.time-popover .picker-confirm-button')?.click();
    fixture.detectChanges();

    expect(task.estimated).toBe('4時間');
    expect(host.querySelector('.time-popover')).toBeNull();
  });

  it('実績工数の修正をポップオーバーで行い、モーダルには履歴だけを表示する', () => {
    TestBed.configureTestingModule({ imports: [TaskListNormalMockComponent] });
    const fixture = TestBed.createComponent(TaskListNormalMockComponent);
    const component = fixture.componentInstance;
    const task = component.tasks.find((candidate) => candidate.id === 'todo-a1-1-1');
    expect(task).toBeDefined();
    if (!task) {
      return;
    }
    component.selectedTaskId = task.id;
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;

    const timePopoverTriggers = host.querySelectorAll<HTMLButtonElement>('.time-popover-trigger');
    const estimatedTrigger = timePopoverTriggers[0];
    const actualTrigger = timePopoverTriggers[1];
    estimatedTrigger.click();
    fixture.detectChanges();
    const estimatedPopoverLeft = host.querySelector<HTMLElement>('.time-popover')?.getBoundingClientRect().left;
    estimatedTrigger.click();
    fixture.detectChanges();
    actualTrigger.click();
    fixture.detectChanges();
    const detailPanelBounds = host.querySelector<HTMLElement>('.detail-panel')?.getBoundingClientRect();
    const timePopoverBounds = host.querySelector<HTMLElement>('.time-popover')?.getBoundingClientRect();
    expect(detailPanelBounds).toBeDefined();
    expect(timePopoverBounds).toBeDefined();
    if (detailPanelBounds && timePopoverBounds) {
      expect(timePopoverBounds.left).toBeCloseTo(estimatedPopoverLeft ?? Number.NaN, 0);
      expect(timePopoverBounds.left).toBeGreaterThanOrEqual(detailPanelBounds.left);
      expect(timePopoverBounds.right).toBeLessThanOrEqual(detailPanelBounds.right);
    }
    const hourInput = host.querySelectorAll<HTMLInputElement>('.time-popover .time-number')[1];
    const minuteInput = host.querySelectorAll<HTMLInputElement>('.time-popover .time-number')[2];
    hourInput.value = '3';
    hourInput.dispatchEvent(new Event('change'));
    minuteInput.value = '0';
    minuteInput.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    host.querySelector<HTMLButtonElement>('.time-popover .picker-confirm-button')?.click();
    fixture.detectChanges();

    expect(task.actual).toBe('3時間');
    expect(component.actualHistoryFor(task).at(-1)?.operation).toContain('修正: +30分');

    const historyButton = host.querySelector<HTMLButtonElement>('.history-button');
    expect(historyButton).not.toBeNull();
    if (!historyButton) {
      return;
    }
    expect(historyButton.textContent?.trim()).toBe('履歴');
    historyButton.click();
    fixture.detectChanges();

    expect(host.querySelector('#actual-history-title')?.textContent?.trim()).toBe('実績工数の履歴');
    expect(host.querySelector('.actual-history-modal .time-range')).toBeNull();
    expect(host.querySelector('.actual-history-modal .modal-confirm-button')).toBeNull();
  });

  it('実績追加は時間と分だけを表示し、追加記号を実績工数ボタンの中央へ配置する', () => {
    TestBed.configureTestingModule({ imports: [TaskListNormalMockComponent] });
    const fixture = TestBed.createComponent(TaskListNormalMockComponent);
    const component = fixture.componentInstance;
    component.selectedTaskId = 'todo-a1-1-1';
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;

    const additionControls = host.querySelector<HTMLElement>('.actual-add-controls');
    const unitLabels = Array.from(additionControls?.querySelectorAll<HTMLElement>('.time-unit-label') ?? [])
      .map((label) => label.textContent?.trim());
    const hourSlider = additionControls?.querySelector<HTMLInputElement>('.time-range[aria-label*="時間"]');
    const additionMark = host.querySelector<HTMLElement>('.addition-mark');
    const actualTrigger = host.querySelector<HTMLButtonElement>('.actual-total-row .time-popover-trigger');
    const actualTotalRow = host.querySelector<HTMLElement>('.actual-total-row');

    expect(unitLabels).toEqual(['時間', '分']);
    expect(hourSlider?.max).toBe('8');
    expect(component.actualAdditionUnits.find((unit) => unit.key === 'hours')?.steps).toContain(8);
    expect(additionMark).not.toBeNull();
    expect(actualTrigger).not.toBeNull();
    if (additionMark && actualTrigger) {
      const additionMarkBounds = additionMark.getBoundingClientRect();
      const actualTriggerBounds = actualTrigger.getBoundingClientRect();
      expect(additionMarkBounds.left + additionMarkBounds.width / 2)
        .toBeCloseTo(actualTriggerBounds.left + actualTriggerBounds.width / 2, 0);
    }
    expect(actualTotalRow && getComputedStyle(actualTotalRow).gap).toBe('4px');
  });
});
