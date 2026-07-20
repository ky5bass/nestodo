import { Component } from '@angular/core';

type TaskKind = 'todo' | 'schedule';
type Priority = 'none' | 'priority' | 'highest';
type TimeField = 'estimated' | 'actual';
type TimeUnit = 'minutes' | 'hours' | 'days';
type ContentField = 'preInfo' | 'notes' | 'reflection';

interface MockTask {
  id: string;
  name: string;
  kind: TaskKind;
  depth: number;
  completed: boolean;
  expanded?: boolean;
  hasChildren?: boolean;
  priority: Priority;
  eventAt?: string;
  eventLabel?: string;
  schedulePrefix?: string;
  estimated?: string;
  actual?: string;
  progress?: string;
  exportFlag?: boolean;
  lastDoneAt?: string;
  preInfo?: string;
  notes?: string;
  reflection?: string;
}

interface ActualHistoryEntry {
  recordedAt: Date;
  operation: '追加' | '修正';
  deltaMinutes: number;
  cumulativeMinutes: number;
}

interface ActualHistoryRow {
  when: string;
  operation: string;
  cumulative: string;
}

interface DateTimeDraft {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

@Component({
  selector: 'app-task-list-normal-mock',
  standalone: true,
  template: `
    <header class="mock-header" (click)="clearSelection()">
      <button class="menu-button" type="button" aria-label="メニューを開く">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          height="24px"
          viewBox="0 -960 960 960"
          width="24px"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M120-240v-80h720v80H120Zm0-200v-80h720v80H120Zm0-200v-80h720v80H120Z" />
        </svg>
      </button>
      <h1>nestodo</h1>
    </header>

    <main class="mock-shell" (click)="clearSelection()">
      <section class="task-board" aria-label="タスク一覧 通常モードモック">
        <div class="list-header">
          <div class="page-title">タスク一覧</div>
          <div class="table-header">
            <span class="name-heading"></span>
            <span>期限</span>
            <span>予定工数</span>
            <span>実績工数</span>
            <span>進捗</span>
            <span aria-hidden="true"></span>
            <button class="edit-button" type="button" aria-label="一括編集モードへ切り替え">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                height="24px"
                viewBox="0 -960 960 960"
                width="24px"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  d="M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Zm640-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z"
                />
              </svg>
            </button>
          </div>
        </div>

        <div class="task-rows">
          @for (task of visibleTasks(); track task.id) {
            <div
              class="task-row priority-{{ task.priority }}"
              [class.completed]="task.completed"
              [class.selected]="selectedTaskId === task.id"
              [style.--task-depth]="task.depth"
              role="button"
              tabindex="0"
              [attr.aria-label]="'タスク詳細を表示: ' + task.name"
              (click)="handleRowClick(task, $event)"
              (keydown.enter)="toggleDetail(task.id)"
              (keydown.space)="toggleDetail(task.id); $event.preventDefault()"
            >
              <span class="task-main">
                <button
                  class="toggle-hit"
                  type="button"
                  [class.empty]="!task.hasChildren"
                  [attr.aria-label]="task.hasChildren ? (task.expanded ? '子タスクを閉じる' : '子タスクを開く') : null"
                  [attr.aria-expanded]="task.hasChildren ? task.expanded : null"
                  (click)="toggleChildren(task, $event)"
                >
                  @if (task.hasChildren) {
                    <span class="disclosure" [class.collapsed]="!task.expanded" aria-hidden="true"></span>
                  }
                </button>
                <button
                  class="checkbox-hit"
                  type="button"
                  [attr.aria-label]="task.completed ? '未完了にする' : '完了にする'"
                  [attr.aria-pressed]="task.completed"
                  (click)="toggleCompleted(task, $event)"
                >
                  <span class="checkbox" [class.checked]="task.completed" aria-hidden="true"></span>
                </button>
                <span class="task-copy">
                  <span class="task-title-line">
                    @if (task.kind === 'schedule' && task.schedulePrefix) {
                      <span class="schedule-prefix">{{ task.schedulePrefix }}</span>
                    }
                    <span class="task-name">{{ task.name }}</span>
                  </span>
                  @if (taskPreview(task); as preview) {
                    <span class="task-preview">{{ preview }}</span>
                  }
                </span>
              </span>
              <span class="meta due">{{ task.eventLabel }}</span>
              <span class="meta metric">
                @for (part of listTimeMetricParts(task.estimated); track $index) {
                  <span [class.metric-unit]="part.unit">{{ part.text }}</span>
                }
              </span>
              <span class="meta metric">
                @for (part of listTimeMetricParts(task.actual); track $index) {
                  <span [class.metric-unit]="part.unit">{{ part.text }}</span>
                }
              </span>
              <span class="meta metric progress">
                @for (part of metricParts(progressLabel(task)); track $index) {
                  <span [class.metric-unit]="part.unit">{{ part.text }}</span>
                }
              </span>
              <button
                class="row-export-button"
                type="button"
                [attr.aria-label]="task.exportFlag ? '日報出力対象。クリックして対象外にする' : '日報出力対象外。クリックして対象にする'"
                [attr.aria-pressed]="!!task.exportFlag"
                (click)="toggleExportFlag(task, $event)"
              >
                @if (task.exportFlag) {
                  <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor" aria-hidden="true">
                    <path d="M607.5-372.5Q660-425 660-500t-52.5-127.5Q555-680 480-680t-127.5 52.5Q300-575 300-500t52.5 127.5Q405-320 480-320t127.5-52.5Zm-204-51Q372-455 372-500t31.5-76.5Q435-608 480-608t76.5 31.5Q588-545 588-500t-31.5 76.5Q525-392 480-392t-76.5-31.5ZM214-281.5Q94-363 40-500q54-137 174-218.5T480-800q146 0 266 81.5T920-500q-54 137-174 218.5T480-200q-146 0-266-81.5ZM480-500Zm207.5 160.5Q782-399 832-500q-50-101-144.5-160.5T480-720q-113 0-207.5 59.5T128-500q50 101 144.5 160.5T480-280q113 0 207.5-59.5Z" />
                  </svg>
                } @else {
                  <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor" aria-hidden="true">
                    <path d="m644-428-58-58q9-47-27-88t-93-32l-58-58q17-8 34.5-12t37.5-4q75 0 127.5 52.5T660-500q0 20-4 37.5T644-428Zm128 126-58-56q38-29 67.5-63.5T832-500q-50-101-143.5-160.5T480-720q-29 0-57 4t-55 12l-62-62q41-17 84-25.5t90-8.5q151 0 269 83.5T920-500q-23 59-60.5 109.5T772-302Zm20 246L624-222q-35 11-70.5 16.5T480-200q-151 0-269-83.5T40-500q21-53 53-98.5t73-81.5L56-792l56-56 736 736-56 56ZM222-624q-29 26-53 57t-41 67q50 101 143.5 160.5T480-280q20 0 39-2.5t39-5.5l-36-38q-11 3-21 4.5t-21 1.5q-75 0-127.5-52.5T300-500q0-11 1.5-21t4.5-21l-84-82Zm319 93Zm-151 75Z" />
                  </svg>
                }
              </button>
              <span class="row-action-space" aria-hidden="true"></span>
            </div>
          }
        </div>
      </section>

      @if (selectedTask(); as detail) {
        <aside class="detail-panel" aria-label="タスク詳細" (click)="$event.stopPropagation()">
          <header class="panel-header">
            <div
              class="title-input"
              contenteditable="true"
              role="textbox"
              aria-label="タスク名"
              aria-multiline="false"
              [textContent]="detail.name"
              (beforeinput)="preventTaskNameLineBreak($event)"
              (input)="changeTaskName(detail, $event)"
            ></div>
            <button class="panel-close-button" type="button" aria-label="閉じる" (click)="clearSelection()">
              <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor" aria-hidden="true">
                <path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z" />
              </svg>
            </button>
          </header>

          <section class="detail-fields" aria-label="タスク属性">
            <div class="detail-top-row">
              <fieldset class="radio-group" aria-label="種別">
                <label>
                  <input type="radio" name="mock-task-type" value="TODO" [checked]="detail.kind === 'todo'" (change)="changeTaskKind(detail, 'todo')" />
                  TODO
                </label>
                <label>
                  <input type="radio" name="mock-task-type" value="SCHEDULE" [checked]="detail.kind === 'schedule'" (change)="changeTaskKind(detail, 'schedule')" />
                  予定
                </label>
              </fieldset>
              <div class="actions-row">
                @if (detail.exportFlag) {
                  <svg class="export-icon" role="button" tabindex="0" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor" aria-label="日報出力対象。クリックして対象外にする" (click)="toggleExportFlag(detail)" (keydown.enter)="toggleExportFlag(detail)" (keydown.space)="toggleExportFlag(detail); $event.preventDefault()">
                    <path d="M607.5-372.5Q660-425 660-500t-52.5-127.5Q555-680 480-680t-127.5 52.5Q300-575 300-500t52.5 127.5Q405-320 480-320t127.5-52.5Zm-204-51Q372-455 372-500t31.5-76.5Q435-608 480-608t76.5 31.5Q588-545 588-500t-31.5 76.5Q525-392 480-392t-76.5-31.5ZM214-281.5Q94-363 40-500q54-137 174-218.5T480-800q146 0 266 81.5T920-500q-54 137-174 218.5T480-200q-146 0-266-81.5ZM480-500Zm207.5 160.5Q782-399 832-500q-50-101-144.5-160.5T480-720q-113 0-207.5 59.5T128-500q50 101 144.5 160.5T480-280q113 0 207.5-59.5Z" />
                  </svg>
                } @else {
                  <svg class="export-icon" role="button" tabindex="0" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor" aria-label="日報出力対象外。クリックして対象にする" (click)="toggleExportFlag(detail)" (keydown.enter)="toggleExportFlag(detail)" (keydown.space)="toggleExportFlag(detail); $event.preventDefault()">
                    <path d="m644-428-58-58q9-47-27-88t-93-32l-58-58q17-8 34.5-12t37.5-4q75 0 127.5 52.5T660-500q0 20-4 37.5T644-428Zm128 126-58-56q38-29 67.5-63.5T832-500q-50-101-143.5-160.5T480-720q-29 0-57 4t-55 12l-62-62q41-17 84-25.5t90-8.5q151 0 269 83.5T920-500q-23 59-60.5 109.5T772-302Zm20 246L624-222q-35 11-70.5 16.5T480-200q-151 0-269-83.5T40-500q21-53 53-98.5t73-81.5L56-792l56-56 736 736-56 56ZM222-624q-29 26-53 57t-41 67q50 101 143.5 160.5T480-280q20 0 39-2.5t39-5.5l-36-38q-11 3-21 4.5t-21 1.5q-75 0-127.5-52.5T300-500q0-11 1.5-21t4.5-21l-84-82Zm319 93Zm-151 75Z" />
                  </svg>
                }
              </div>
            </div>

            <section class="attribute-group" aria-labelledby="before-heading">
              <h2 id="before-heading">PLAN</h2>
              <label class="field">
                <span>事前情報</span>
                <span class="resizable-textarea">
                  <textarea #preInfoTextarea rows="4" [value]="detail.preInfo || ''" (input)="changeContent(detail, 'preInfo', $event)"></textarea>
                  <span
                    class="textarea-resize-handle"
                    role="separator"
                    tabindex="0"
                    aria-label="事前情報の入力欄の高さを変更"
                    aria-orientation="horizontal"
                    (pointerdown)="startTextareaResize(preInfoTextarea, $event)"
                    (pointermove)="resizeTextarea($event)"
                    (pointerup)="endTextareaResize($event)"
                    (pointercancel)="endTextareaResize($event)"
                    (keydown)="resizeTextareaWithKeyboard(preInfoTextarea, $event)"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor" aria-hidden="true">
                      <path d="M784-120 120-783l57-57 663 663-56 57Zm-401 0L120-383l57-57 263 263-57 57Z" />
                    </svg>
                  </span>
                </span>
              </label>
              <div class="field horizontal-field">
                <span>優先度</span>
                <div class="priority-segments" role="group" aria-label="優先度">
                  <button type="button" [class.active]="detail.priority === 'none'" [attr.aria-pressed]="detail.priority === 'none'" (click)="changePriority(detail, 'none')">なし</button>
                  <button type="button" [class.active]="detail.priority === 'priority'" [attr.aria-pressed]="detail.priority === 'priority'" (click)="changePriority(detail, 'priority')">優先</button>
                  <button type="button" [class.active]="detail.priority === 'highest'" [attr.aria-pressed]="detail.priority === 'highest'" (click)="changePriority(detail, 'highest')">最優先</button>
                </div>
              </div>
              <div class="field horizontal-field date-time-field">
                <span>{{ detail.kind === 'todo' ? '期限' : '開始日時' }}</span>
                <div class="date-time-control">
                  <button
                    class="date-time-trigger"
                    type="button"
                    [class.empty]="!detail.eventAt"
                    [attr.aria-expanded]="dateTimePopoverTaskId === detail.id"
                    aria-haspopup="dialog"
                    (click)="toggleDateTimePopover(detail, $event)"
                  >
                    <span>{{ eventAtDisplay(detail) }}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor" aria-hidden="true">
                      <path d="M200-80q-33 0-56.5-23.5T120-160v-560q0-33 23.5-56.5T200-800h40v-80h80v80h320v-80h80v80h40q33 0 56.5 23.5T840-720v560q0 33-23.5 56.5T760-80H200Zm0-80h560v-400H200v400Zm0-480h560v-80H200v80Zm0 0v-80 80Z" />
                    </svg>
                  </button>

                  @if (dateTimePopoverTaskId === detail.id && dateTimeDraft; as draft) {
                    <section class="date-time-popover" role="dialog" aria-modal="false" aria-label="日時を選択" (click)="$event.stopPropagation()" (keydown.escape)="closeDateTimePopover()">
                      <div class="date-time-picker-body">
                        <div class="calendar-pane">
                          <div class="calendar-header">
                            <button type="button" aria-label="前の月" (click)="moveCalendarMonth(-1)">‹</button>
                            <strong>{{ calendarMonthLabel() }}</strong>
                            <button type="button" aria-label="次の月" (click)="moveCalendarMonth(1)">›</button>
                          </div>
                          <div class="calendar-grid" role="grid" aria-label="カレンダー">
                            @for (weekday of weekdays; track weekday) {
                              <span class="weekday" aria-hidden="true">{{ weekday }}</span>
                            }
                            @for (cell of calendarCells(); track $index) {
                              @if (cell === null) {
                                <span class="calendar-blank" aria-hidden="true"></span>
                              } @else {
                                <button
                                  type="button"
                                  [class.selected]="isDraftDay(cell)"
                                  [class.today]="isToday(cell)"
                                  [attr.aria-label]="calendarDayLabel(cell)"
                                  [attr.aria-pressed]="isDraftDay(cell)"
                                  (click)="selectCalendarDay(cell)"
                                >{{ cell }}</button>
                              }
                            }
                          </div>
                          <button class="picker-shortcut" type="button" (click)="setDraftToday()">今日</button>
                        </div>

                        <div class="time-pane">
                          <div class="time-heading"><span>時</span><span>分</span></div>
                          <div class="time-drums">
                            <div class="time-drum" role="listbox" aria-label="時" (scroll)="changeDraftFromDrum('hour', $event)">
                              @for (hour of hours; track hour) {
                                <button type="button" role="option" [class.selected]="draft.hour === hour" [attr.aria-selected]="draft.hour === hour" (click)="selectDraftHour(hour, $event)">{{ padNumber(hour) }}</button>
                              }
                            </div>
                            <span class="time-separator" aria-hidden="true">:</span>
                            <div class="time-drum" role="listbox" aria-label="分" (scroll)="changeDraftFromDrum('minute', $event)">
                              @for (minute of minuteOptions; track minute) {
                                <button type="button" role="option" [class.selected]="draft.minute === minute" [attr.aria-selected]="draft.minute === minute" (click)="selectDraftMinute(minute, $event)">{{ padNumber(minute) }}</button>
                              }
                            </div>
                          </div>
                          <button class="picker-shortcut" type="button" (click)="setDraftCurrentTime()">現在時刻</button>
                        </div>
                      </div>

                      <div class="date-time-actions">
                        <button class="picker-clear-button" type="button" (click)="clearDateTime(detail)">クリア</button>
                        <button class="picker-confirm-button" type="button" (click)="confirmDateTime(detail)">決定</button>
                      </div>
                    </section>
                  }
                </div>
              </div>
              <div class="field horizontal-field">
                <span>予定工数</span>
                <div class="time-input">
                  @for (unit of timeUnits; track unit.key) {
                    <label class="time-unit">
                      <input class="time-range" type="range" min="0" [max]="unit.steps.length" [attr.aria-label]="'予定工数（' + unit.label + '）'" [value]="timeStepIndex(detail.estimated, unit.key)" (input)="changeTimeSlider(detail, 'estimated', unit.key, $event)" />
                      <input class="time-number" type="number" min="0" step="1" inputmode="numeric" [attr.aria-label]="'予定工数（' + unit.label + '）'" [value]="timePart(detail.estimated, unit.key)" (change)="changeTimeNumber(detail, 'estimated', unit.key, $event)" />
                      <span class="time-unit-label">{{ unit.label }}</span>
                    </label>
                  }
                </div>
              </div>
            </section>

            <section class="attribute-group" aria-labelledby="in-progress-heading">
              <h2 id="in-progress-heading">DO</h2>
              <label class="field">
                <span>ノート</span>
                <span class="resizable-textarea">
                  <textarea #notesTextarea rows="4" [value]="detail.notes || ''" (input)="changeContent(detail, 'notes', $event)"></textarea>
                  <span
                    class="textarea-resize-handle"
                    role="separator"
                    tabindex="0"
                    aria-label="ノートの入力欄の高さを変更"
                    aria-orientation="horizontal"
                    (pointerdown)="startTextareaResize(notesTextarea, $event)"
                    (pointermove)="resizeTextarea($event)"
                    (pointerup)="endTextareaResize($event)"
                    (pointercancel)="endTextareaResize($event)"
                    (keydown)="resizeTextareaWithKeyboard(notesTextarea, $event)"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor" aria-hidden="true">
                      <path d="M784-120 120-783l57-57 663 663-56 57Zm-401 0L120-383l57-57 263 263-57 57Z" />
                    </svg>
                  </span>
                </span>
              </label>
              <div class="field horizontal-field">
                <span>進捗</span>
                <div class="progress-control">
                  <input class="progress-range" type="range" min="0" max="100" step="5" [value]="displayProgressValue(detail)" (input)="previewProgress(detail, $event)" (change)="commitProgress(detail, $event)" />
                  <label class="progress-number">
                    <input type="number" min="0" max="100" step="1" inputmode="numeric" aria-label="進捗率" [value]="displayProgressValue(detail)" (change)="commitProgress(detail, $event)" />
                    <span>％</span>
                  </label>
                </div>
              </div>
              <div class="field horizontal-field">
                <span>実績工数</span>
                <div class="actual-time-input">
                  <div class="actual-total-row">
                    <div class="actual-total metric" aria-label="現在の実績工数">
                      @for (part of metricParts(detail.actual || '0分'); track $index) {
                        <span [class.metric-unit]="part.unit">{{ part.text }}</span>
                      }
                    </div>
                    <button class="history-button" type="button" (click)="openActualHistory(detail)">履歴と修正</button>
                  </div>
                  <div class="addition-mark" aria-hidden="true">＋</div>
                  <div class="time-input actual-add-controls">
                    @for (unit of timeUnits; track unit.key) {
                      <label class="time-unit">
                        <input class="time-range" type="range" min="0" [max]="unit.steps.length" [attr.aria-label]="'追加する実績工数（' + unit.label + '）'" [value]="actualAdditionStepIndex(unit.key)" (input)="changeActualAdditionSlider(unit.key, $event)" />
                        <input class="time-number" type="number" min="0" step="1" inputmode="numeric" [attr.aria-label]="'追加する実績工数（' + unit.label + '）'" [value]="actualAddition[unit.key]" (change)="changeActualAdditionNumber(unit.key, $event)" />
                        <span class="time-unit-label">{{ unit.label }}</span>
                      </label>
                    }
                    <button class="add-time-button" type="button" [disabled]="actualAdditionIsZero()" (click)="addActualTime(detail)">実績追加</button>
                  </div>
                </div>
              </div>
            </section>

            <section class="attribute-group after-group" aria-labelledby="after-heading">
              <h2 id="after-heading">REVIEW</h2>
              <label class="field">
                <span>ふりかえり</span>
                <span class="resizable-textarea">
                  <textarea #reflectionTextarea rows="4" [value]="detail.reflection || ''" (input)="changeContent(detail, 'reflection', $event)"></textarea>
                  <span
                    class="textarea-resize-handle"
                    role="separator"
                    tabindex="0"
                    aria-label="ふりかえりの入力欄の高さを変更"
                    aria-orientation="horizontal"
                    (pointerdown)="startTextareaResize(reflectionTextarea, $event)"
                    (pointermove)="resizeTextarea($event)"
                    (pointerup)="endTextareaResize($event)"
                    (pointercancel)="endTextareaResize($event)"
                    (keydown)="resizeTextareaWithKeyboard(reflectionTextarea, $event)"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor" aria-hidden="true">
                      <path d="M784-120 120-783l57-57 663 663-56 57Zm-401 0L120-383l57-57 263 263-57 57Z" />
                    </svg>
                  </span>
                </span>
              </label>
            </section>
          </section>
        </aside>
      }

      @if (actualHistoryTask(); as historyTask) {
        <div class="modal-backdrop" role="presentation" (click)="closeActualHistory($event)">
          <section class="actual-history-modal" role="dialog" aria-modal="true" aria-labelledby="actual-history-title" (click)="$event.stopPropagation()">
            <h2 id="actual-history-title">実績工数の履歴と修正</h2>
            <div class="history-table-wrap">
              <table class="history-table">
                <colgroup>
                  <col class="history-when-column" />
                  <col class="history-operation-column" />
                  <col class="history-total-column" />
                </colgroup>
                <thead>
                  <tr><th aria-label="いつ"></th><th>操作</th><th>実績工数の累計</th></tr>
                </thead>
                <tbody>
                  @for (entry of actualHistoryFor(historyTask); track $index) {
                    <tr>
                      <td>{{ entry.when }}</td>
                      <td class="history-duration">
                        @for (part of metricParts(entry.operation); track $index) {
                          <span [class.history-unit]="part.unit">{{ part.text }}</span>
                        }
                      </td>
                      <td class="history-duration">
                        @for (part of metricParts(entry.cumulative); track $index) {
                          <span [class.history-unit]="part.unit">{{ part.text }}</span>
                        }
                      </td>
                    </tr>
                  } @empty {
                    <tr><td>履歴はありません</td><td></td><td></td></tr>
                  }
                </tbody>
              </table>
            </div>
            <div class="field history-correction-field">
              <span>実績工数を修正</span>
              <div class="time-input history-time-input">
                @for (unit of timeUnits; track unit.key) {
                  <label class="time-unit">
                    <input class="time-range" type="range" min="0" [max]="unit.steps.length" [attr.aria-label]="'修正後の実績工数（' + unit.label + '）'" [value]="actualCorrectionStepIndex(unit.key)" (input)="changeActualCorrectionSlider(unit.key, $event)" />
                    <input class="time-number" type="number" min="0" step="1" inputmode="numeric" [attr.aria-label]="'修正後の実績工数（' + unit.label + '）'" [value]="actualCorrection[unit.key]" (change)="changeActualCorrectionNumber(unit.key, $event)" />
                    <span class="time-unit-label">{{ unit.label }}</span>
                  </label>
                }
              </div>
            </div>
            <div class="modal-actions">
              <button class="modal-cancel-button" type="button" (click)="closeActualHistory($event)">キャンセル</button>
              <button class="modal-confirm-button" type="button" [disabled]="!actualCorrectionChanged(historyTask)" (click)="applyActualCorrection(historyTask, $event)">修正</button>
            </div>
          </section>
        </div>
      }

      @if (confirmationMessage) {
        <div class="modal-backdrop" role="presentation" (click)="cancelConfirmation()">
          <section class="confirmation-modal" role="dialog" aria-modal="true" aria-labelledby="confirmation-title" (click)="$event.stopPropagation()">
            <h2 id="confirmation-title">確認</h2>
            <p>{{ confirmationMessage }}</p>
            @if (confirmationMode === 'reopen') {
              <div class="field modal-progress-field">
                <span>進捗</span>
                <div class="progress-control">
                  <input
                    class="progress-range"
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    [value]="modalProgress"
                    (input)="changeModalProgress($event)"
                  />
                  <label class="progress-number">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      inputmode="numeric"
                      aria-label="未完了に戻す進捗率"
                      [value]="modalProgress"
                      (input)="changeModalProgress($event)"
                    />
                    <span>％</span>
                  </label>
                </div>
              </div>
            }
            <div class="modal-actions">
              <button class="modal-cancel-button" type="button" (click)="$event.stopPropagation(); cancelConfirmation()">キャンセル</button>
              <button
                class="modal-confirm-button"
                type="button"
                [disabled]="confirmationMode === 'reopen' && modalProgress >= 100"
                (click)="$event.stopPropagation(); confirmPendingAction()"
              >
                {{ confirmationMode === 'reopen' ? '決定' : 'はい' }}
              </button>
            </div>
          </section>
        </div>
      }
    </main>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100vh;
        background: #080b0f;
        color: #e8edf2;
        font-family: "BIZ UDGothic", sans-serif;
        font-style: normal;
        font-weight: 400;
      }

      .mock-header {
        align-items: stretch;
        background: #0d1117;
        border-bottom: 1px solid #27313c;
        display: flex;
        gap: 12px;
        left: 0;
        min-height: 56px;
        padding: 8px 16px;
        position: fixed;
        right: 0;
        top: 0;
        z-index: 30;
      }

      .menu-button {
        align-items: center;
        background: #121821;
        border: 1px solid #33404d;
        border-radius: 6px;
        color: #b7b7b7;
        cursor: pointer;
        display: inline-grid;
        gap: 5px;
        height: 40px;
        justify-content: center;
        padding: 0;
        width: 40px;
      }

      .menu-button svg {
        display: block;
        height: 24px;
        width: 24px;
      }

      .menu-button:hover {
        color: #ffffff;
      }

      h1 {
        font-size: 1.25rem;
        font-weight: 400;
        letter-spacing: 0;
        line-height: 1.2;
        margin: 0;
      }

      .mock-shell {
        background: #080b0f;
        min-height: calc(100vh - 56px);
        padding-top: 140px;
        position: relative;
      }

      .task-board {
        background: #0b0f14;
        min-width: 0;
        overflow-x: auto;
        padding: 0 0 32px;
      }

      .table-header,
      .task-row {
        display: grid;
        grid-template-columns: minmax(720px, 1fr) 120px 130px 130px 90px 56px 56px;
        min-width: 1302px;
      }

      .list-header {
        background: #0b0f14;
        left: 0;
        min-width: 1302px;
        overflow-x: auto;
        position: fixed;
        right: 0;
        top: 56px;
        z-index: 20;
      }

      .page-title {
        align-items: center;
        background: #080b0f;
        border-bottom: 1px solid #202a35;
        color: #e8edf2;
        display: flex;
        font-size: 1.05rem;
        font-weight: 400;
        min-height: 40px;
        padding: 0 42px;
      }

      .table-header {
        align-items: center;
        background: #111821;
        border-bottom: 1px solid #2b3643;
        color: #c7d0da;
        font-size: 0.9rem;
        font-weight: 400;
        min-height: 44px;
      }

      .table-header > span {
        align-items: center;
        display: flex;
        justify-content: center;
        padding: 0 12px;
        white-space: nowrap;
      }

      .name-heading {
        justify-content: flex-start;
        padding-left: 42px;
      }

      .edit-button {
        align-items: center;
        align-self: stretch;
        background: transparent;
        border: 0;
        color: #94a0ad;
        cursor: pointer;
        display: inline-flex;
        justify-content: center;
        line-height: 1;
        padding: 0;
      }

      .edit-button svg {
        display: block;
        height: 28px;
        width: 28px;
      }

      .edit-button:hover {
        color: #e8edf2;
      }

      .task-rows {
        min-width: 1302px;
      }

      .task-row {
        --task-depth: 0;
        align-items: center;
        background: #0b0f14;
        border: 0;
        border-bottom: 1px solid #202a35;
        color: #e8edf2;
        cursor: pointer;
        font: inherit;
        font-weight: 400;
        min-height: 44px;
        padding: 0;
        text-align: left;
        width: 100%;
      }

      .task-row:hover {
        background: #111923;
      }

      .task-row.selected {
        background: #1b2b37;
      }

      .task-row.priority-highest {
        color: #ff6b73;
      }

      .task-row.priority-priority {
        color: #f2b84b;
      }

      .task-row.completed {
        color: #687482;
      }

      .task-row.completed.priority-priority,
      .task-row.completed.priority-highest {
        color: #687482;
      }

      .task-main {
        align-items: center;
        align-self: stretch;
        display: grid;
        grid-template-columns: calc(var(--task-depth) * 52px + 42px) 34px minmax(0, 1fr);
        height: 100%;
        min-width: 0;
        padding: 0 12px 0 0;
      }

      .toggle-hit,
      .checkbox-hit {
        align-items: center;
        background: transparent;
        border: 0;
        color: inherit;
        cursor: pointer;
        display: inline-flex;
        height: 100%;
        justify-content: center;
        min-height: 44px;
        padding: 0;
      }

      .toggle-hit {
        justify-content: flex-end;
        padding-left: 14px;
        width: 100%;
      }

      .toggle-hit.empty {
        cursor: default;
      }

      .disclosure {
        display: inline-block;
        height: 18px;
        width: 18px;
      }

      .disclosure::before {
        border-left: 6px solid transparent;
        border-right: 6px solid transparent;
        border-top: 8px solid currentColor;
        content: "";
        display: block;
        margin: 6px 3px 0;
      }

      .disclosure.collapsed::before {
        border-bottom: 6px solid transparent;
        border-left: 8px solid currentColor;
        border-right: 0;
        border-top: 6px solid transparent;
        margin: 4px 5px;
      }

      .checkbox-hit {
        justify-self: center;
        width: 32px;
      }

      .checkbox {
        background: transparent;
        border: 1px solid #64717f;
        border-radius: 4px;
        display: inline-block;
        height: 18px;
        justify-self: center;
        width: 18px;
      }

      .checkbox.checked {
        align-items: center;
        background: #1a2028;
        border-color: #6f7a86;
        color: #9aa4af;
        display: inline-flex;
        font-size: 13px;
        font-weight: 800;
        justify-content: center;
      }

      .checkbox.checked::before {
        content: "✓";
        transform: translateY(-1px);
      }

      .task-copy {
        display: grid;
        gap: 1px;
        min-width: 0;
      }

      .task-title-line {
        align-items: baseline;
        display: flex;
        font-size: 1.15rem;
        font-weight: 400;
        gap: 6px;
        letter-spacing: 0;
        line-height: 1.2;
        min-width: 0;
      }

      .schedule-prefix {
        border: 1px solid currentColor;
        border-radius: 999px;
        flex: 0 0 auto;
        font-size: 0.95rem;
        font-weight: 400;
        line-height: 1;
        padding: 5px 10px;
      }

      .task-name {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .task-preview {
        font-size: 0.82rem;
        font-weight: 400;
        line-height: 1.15;
        overflow: hidden;
        padding-left: 14px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .completed .task-name,
      .completed .schedule-prefix {
        color: #687482;
        text-decoration: line-through;
      }

      .completed .task-preview {
        text-decoration: none;
      }

      .meta {
        align-items: center;
        display: flex;
        font-size: 1rem;
        font-weight: 400;
        justify-content: center;
        line-height: 1.2;
        min-width: 0;
        padding: 6px 10px;
        white-space: nowrap;
      }

      .due {
        font-size: 0.95rem;
      }

      .due:not(:empty) {
        border: 1px solid currentColor;
        border-radius: 999px;
        justify-self: center;
        margin: 0 10px;
        padding: 5px 10px;
      }

      .progress {
        justify-content: end;
        padding-right: 18px;
      }

      .metric {
        gap: 1px;
      }

      .metric-unit {
        align-self: flex-end;
        font-size: 0.68em;
        line-height: 1.25;
        padding-left: 1px;
        transform: translateY(1px);
      }

      .completed .meta {
        color: #687482;
      }

      .row-action-space {
        display: block;
      }

      .row-export-button {
        align-items: center;
        align-self: stretch;
        background: transparent;
        border: 0;
        color: inherit;
        cursor: pointer;
        display: inline-flex;
        justify-content: center;
        opacity: 1;
        padding: 0;
        transition: color 140ms ease, opacity 140ms ease;
      }

      .row-export-button[aria-pressed='true']:not(:hover):not(:focus-visible) {
        opacity: 0;
      }

      .row-export-button:hover,
      .row-export-button:focus-visible {
        color: #ffffff;
        outline: none;
      }

      .row-export-button svg {
        display: block;
        height: 24px;
        width: 24px;
      }

      .detail-panel {
        background: #0f151d;
        border-left: 1px solid #303b49;
        bottom: 0;
        box-shadow: -24px 0 48px rgba(0, 0, 0, 0.38);
        box-sizing: border-box;
        color: #e8edf2;
        display: grid;
        font-size: 1rem;
        gap: 18px;
        overflow: auto;
        overscroll-behavior: contain;
        padding: 0 28px 18px 18px;
        position: fixed;
        right: 0;
        top: 56px;
        width: min(582px, 92vw);
        z-index: 29;
      }

      .panel-header,
      .actions-row {
        align-items: center;
        display: flex;
        gap: 10px;
      }

      .detail-top-row {
        align-items: center;
        display: flex;
        justify-content: space-between;
      }

      .panel-header {
        align-items: flex-start;
        background: #0f151d;
        justify-content: space-between;
        margin: 0 -28px 0 -18px;
        padding: 18px 28px 10px 18px;
        position: sticky;
        top: 0;
        z-index: 2;
      }

      .title-input {
        background: #121a24;
        border: 1px solid #33404d;
        border-radius: 6px;
        color: #e8edf2;
        box-sizing: border-box;
        flex: 1;
        font: inherit;
        font-size: 1.15rem;
        line-height: 1.45;
        min-height: 44px;
        min-width: 0;
        overflow-wrap: anywhere;
        padding: 8px;
        white-space: normal;
      }

      .title-input:focus {
        border-color: #607286;
        outline: none;
      }

      .panel-close-button {
        align-items: center;
        background: transparent;
        border: 0;
        color: #b7b7b7;
        cursor: pointer;
        display: inline-flex;
        flex: 0 0 40px;
        height: 36px;
        justify-content: center;
        margin-right: -14px;
        margin-top: -10px;
        padding: 0;
        transition: color 140ms ease;
        width: 36px;
      }

      .panel-close-button svg {
        height: 32px;
        width: 32px;
      }

      .panel-close-button:hover,
      .panel-close-button:focus-visible {
        color: #ffffff;
        outline: none;
      }

      .detail-fields,
      .attribute-group {
        display: grid;
      }

      .detail-fields {
        gap: 28px;
      }

      .attribute-group {
        gap: 14px;
        border-left: 1px solid #3f4c59;
        margin-left: 6px;
        padding-bottom: 8px;
        padding-left: 24px;
        padding-top: 14px;
        position: relative;
      }

      .after-group {
        margin-bottom: 140px;
      }

      .attribute-group h2 {
        color: #62a69e;
        font-size: 0.7rem;
        font-weight: 700;
        letter-spacing: 0.12em;
        margin: 0 0 0 -8px;
        position: relative;
      }

      .attribute-group h2::before {
        background: #0f151d;
        border: 1px solid #62a69e;
        content: '';
        height: 8px;
        left: -21px;
        position: absolute;
        top: 50%;
        transform: translateY(-50%) rotate(45deg);
        width: 8px;
      }

      .field,
      .radio-group {
        border: 0;
        color: #aeb8c3;
        display: grid;
        font-size: 1rem;
        gap: 6px;
        margin: 0;
        padding: 0;
      }

      .field.horizontal-field {
        align-items: start;
        column-gap: 14px;
        grid-template-columns: 104px minmax(0, 1fr);
      }

      .horizontal-field > span {
        padding-top: 9px;
      }

      .radio-group {
        column-gap: 14px;
        grid-template-columns: repeat(2, max-content);
      }

      .detail-panel input[type='radio'],
      .detail-panel input[type='checkbox'] {
        accent-color: #62a69e;
        block-size: 20px;
        flex: 0 0 20px;
        inline-size: 20px;
        margin: 0;
      }

      .radio-group label {
        align-items: center;
        color: #e8edf2;
        display: inline-flex;
        gap: 8px;
        white-space: nowrap;
      }

      .radio-group label,
      .radio-group input {
        cursor: pointer;
      }

      .field input,
      .field textarea {
        background: #121a24;
        border: 1px solid #33404d;
        border-radius: 6px;
        color: #e8edf2;
        font: inherit;
        min-width: 0;
        padding: 8px;
        width: 100%;
      }

      .field textarea {
        box-sizing: border-box;
        min-height: 132px;
        resize: none;
      }

      .resizable-textarea {
        display: block;
        min-width: 0;
        position: relative;
      }

      .resizable-textarea textarea {
        display: block;
        padding-bottom: 18px;
      }

      .textarea-resize-handle {
        align-items: flex-end;
        bottom: 0;
        color: #7e8d9d;
        cursor: ns-resize;
        display: flex;
        height: 32px;
        justify-content: flex-end;
        position: absolute;
        right: 0;
        touch-action: none;
        width: 44px;
      }

      .textarea-resize-handle svg {
        height: 24px;
        transform: scaleX(-1);
        width: 24px;
      }

      .textarea-resize-handle:hover,
      .textarea-resize-handle:focus-visible {
        color: #e3e3e3;
      }

      .textarea-resize-handle:focus-visible {
        border-radius: 4px;
        outline: 2px solid #62a69e;
        outline-offset: -4px;
      }

      .date-time-control {
        min-width: 0;
        position: relative;
      }

      .date-time-trigger {
        align-items: center;
        background: #121a24;
        border: 1px solid #33404d;
        border-radius: 6px;
        color: #e8edf2;
        cursor: pointer;
        display: flex;
        font: inherit;
        justify-content: space-between;
        min-height: 40px;
        padding: 7px 8px 7px 10px;
        text-align: left;
        width: 100%;
      }

      .date-time-trigger.empty {
        color: #7e8d9d;
      }

      .date-time-trigger:hover,
      .date-time-trigger:focus-visible {
        border-color: #607286;
        outline: none;
      }

      .date-time-trigger svg {
        color: #aeb8c3;
        flex: 0 0 22px;
        height: 22px;
        width: 22px;
      }

      .date-time-popover {
        background: #18222d;
        border: 1px solid #40505f;
        border-radius: 10px;
        box-shadow: 0 18px 48px rgb(0 0 0 / 45%);
        box-sizing: border-box;
        color: #e8edf2;
        margin-top: 6px;
        padding: 14px;
        position: absolute;
        right: 0;
        width: min(430px, calc(100vw - 40px));
        z-index: 5;
      }

      .date-time-picker-body {
        display: grid;
        gap: 16px;
        grid-template-columns: minmax(230px, 1fr) 136px;
      }

      .calendar-header {
        align-items: center;
        display: grid;
        grid-template-columns: 36px 1fr 36px;
        margin-bottom: 8px;
        text-align: center;
      }

      .calendar-header strong {
        font-size: 0.95rem;
        font-weight: 650;
      }

      .calendar-header button,
      .calendar-grid button {
        align-items: center;
        background: transparent;
        border: 0;
        color: #dfe6ec;
        cursor: pointer;
        display: flex;
        font: inherit;
        justify-content: center;
      }

      .calendar-header button {
        border-radius: 6px;
        font-size: 1.65rem;
        height: 34px;
        line-height: 1;
      }

      .calendar-header button:hover,
      .calendar-header button:focus-visible,
      .calendar-grid button:hover,
      .calendar-grid button:focus-visible {
        background: #273542;
        outline: none;
      }

      .calendar-grid {
        display: grid;
        grid-auto-rows: 31px;
        grid-template-columns: repeat(7, 1fr);
        text-align: center;
      }

      .calendar-grid .weekday {
        color: #8594a2;
        font-size: 0.72rem;
        line-height: 31px;
      }

      .calendar-grid button {
        border-radius: 50%;
        font-size: 0.86rem;
        height: 29px;
        justify-self: center;
        position: relative;
        width: 29px;
      }

      .calendar-grid button.today::after {
        background: #62a69e;
        border-radius: 50%;
        bottom: 3px;
        content: '';
        height: 3px;
        left: 50%;
        position: absolute;
        transform: translateX(-50%);
        width: 3px;
      }

      .calendar-grid button.selected {
        background: #2d6f68;
        color: #ffffff;
        font-weight: 700;
      }

      .time-pane {
        border-left: 1px solid #33404d;
        padding-left: 16px;
      }

      .time-heading {
        color: #8594a2;
        display: grid;
        font-size: 0.72rem;
        grid-template-columns: 1fr 1fr;
        margin-bottom: 6px;
        text-align: center;
      }

      .time-drums {
        align-items: center;
        display: grid;
        grid-template-columns: 48px 12px 48px;
      }

      .time-drum {
        background: #101820;
        border-block: 1px solid #33404d;
        height: 146px;
        overflow-y: auto;
        overscroll-behavior: contain;
        scroll-snap-type: y mandatory;
        scrollbar-color: #40505f transparent;
        scrollbar-width: thin;
      }

      .time-drum::before,
      .time-drum::after {
        content: '';
        display: block;
        height: 49px;
        scroll-snap-align: none;
      }

      .time-drum button {
        background: transparent;
        border: 0;
        color: #82909d;
        cursor: pointer;
        display: block;
        font: inherit;
        height: 48px;
        scroll-snap-align: center;
        width: 100%;
      }

      .time-drum button:hover,
      .time-drum button:focus-visible {
        background: #273542;
        color: #e8edf2;
        outline: none;
      }

      .time-drum button.selected {
        background: #234b49;
        color: #ffffff;
        font-size: 1.08rem;
        font-weight: 700;
      }

      .time-separator {
        font-size: 1.2rem;
        text-align: center;
      }

      .picker-shortcut {
        background: transparent;
        border: 1px solid #40505f;
        border-radius: 6px;
        color: #b9d9d5;
        cursor: pointer;
        font: inherit;
        font-size: 0.82rem;
        margin-top: 10px;
        min-height: 32px;
        width: 100%;
      }

      .picker-shortcut:hover,
      .picker-shortcut:focus-visible {
        background: #273542;
        outline: 2px solid transparent;
      }

      .date-time-actions {
        border-top: 1px solid #33404d;
        display: flex;
        gap: 8px;
        justify-content: flex-end;
        margin-top: 14px;
        padding-top: 12px;
      }

      .date-time-actions button {
        border-radius: 6px;
        cursor: pointer;
        font: inherit;
        min-height: 36px;
        padding: 6px 18px;
      }

      .picker-clear-button {
        background: transparent;
        border: 1px solid #566574;
        color: #d3dbe2;
      }

      .picker-confirm-button {
        background: #2d6f68;
        border: 1px solid #438c84;
        color: #ffffff;
      }

      @media (max-width: 560px) {
        .date-time-popover {
          left: -118px;
          right: auto;
        }

        .date-time-picker-body {
          grid-template-columns: 1fr;
        }

        .time-pane {
          border-left: 0;
          border-top: 1px solid #33404d;
          padding-left: 0;
          padding-top: 12px;
        }

        .time-drums {
          justify-content: center;
        }
      }

      .detail-panel input[type='number']::-webkit-inner-spin-button {
        cursor: pointer;
        height: 40px;
      }

      .time-input {
        display: grid;
        column-gap: 2px;
        grid-template-columns: repeat(3, max-content);
        justify-content: start;
        row-gap: 12px;
      }

      .time-unit {
        align-items: center;
        display: grid;
        column-gap: 5px;
        grid-template-columns: 58px 2.2rem;
        grid-template-rows: 80px auto;
        min-width: 0;
      }

      .time-unit .time-range {
        appearance: none;
        background: transparent;
        border: 0;
        border-radius: 0;
        cursor: pointer;
        direction: rtl;
        height: 80px;
        grid-column: 1;
        grid-row: 1;
        justify-self: center;
        padding: 0;
        width: 24px;
        writing-mode: vertical-lr;
      }

      .time-unit .time-range::-webkit-slider-runnable-track {
        background: #34434d;
        border-radius: 999px;
        height: 100%;
        width: 14px;
      }

      .time-unit .time-range::-webkit-slider-thumb {
        appearance: none;
        background: #62a69e;
        border: 2px solid #9acbc5;
        border-radius: 50%;
        box-sizing: border-box;
        height: 24px;
        margin-left: -5px;
        width: 24px;
      }

      .time-unit .time-range::-moz-range-track {
        background: #34434d;
        border-radius: 999px;
        height: 100%;
        width: 24px;
      }

      .time-unit .time-range::-moz-range-thumb {
        background: #62a69e;
        border: 2px solid #9acbc5;
        border-radius: 50%;
        box-sizing: border-box;
        height: 24px;
        width: 24px;
      }

      .time-unit-label {
        color: #e8edf2;
        font-size: 0.68rem;
        grid-column: 2;
        grid-row: 2;
        line-height: 1.25;
      }

      .time-unit .time-number {
        box-sizing: border-box;
        grid-column: 1;
        grid-row: 2;
        padding: 7px 6px;
        text-align: center;
        width: 58px;
      }

      .actual-time-input {
        display: grid;
        gap: 2px;
      }

      .actual-total {
        color: #e8edf2;
        font-size: 1rem;
        justify-content: flex-start;
        min-height: 24px;
        padding: 0;
      }

      .actual-total-row {
        align-items: center;
        display: flex;
        gap: 12px;
        justify-content: flex-start;
        transform: translateY(6px);
      }

      .history-button {
        background: #1a2430;
        border: 1px solid #435162;
        border-radius: 6px;
        color: #e8edf2;
        cursor: pointer;
        font: inherit;
        padding: 6px 10px;
        transform: translateY(-3px);
      }

      .addition-mark {
        color: #aeb8c3;
        font-size: 0.82rem;
        line-height: 1;
        transform: translateX(8px) translateY(2px);
      }

      .actual-add-controls {
        grid-template-columns: repeat(3, max-content) max-content;
        margin-top: 6px;
      }

      .add-time-button {
        align-self: end;
        background: #2d6f68;
        border: 1px solid #3d817a;
        border-radius: 6px;
        color: #ffffff;
        cursor: pointer;
        font: inherit;
        margin-bottom: 1px;
        min-height: 36px;
        padding: 7px 12px;
      }

      .add-time-button:disabled {
        background: #26333a;
        border-color: #35444c;
        color: #71808a;
        cursor: not-allowed;
      }

      .actual-history-modal {
        background: #121a24;
        border: 1px solid #3b4857;
        border-radius: 8px;
        box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5);
        box-sizing: border-box;
        display: grid;
        gap: 20px;
        max-height: calc(100vh - 40px);
        max-width: 800px;
        overflow: auto;
        padding: 22px;
        width: 100%;
      }

      .actual-history-modal h2 {
        font-size: 1.1rem;
        font-weight: 400;
        margin: 0;
      }

      .history-table-wrap {
        max-height: 220px;
        overflow: auto;
      }

      .history-table {
        border-collapse: collapse;
        color: #e8edf2;
        table-layout: fixed;
        width: 100%;
      }

      .history-when-column {
        width: 23%;
      }

      .history-operation-column {
        width: 54%;
      }

      .history-total-column {
        width: 23%;
      }

      .history-table th,
      .history-table td {
        border-bottom: 1px solid #33404d;
        padding: 9px 10px;
        text-align: left;
      }

      .history-table th {
        background: #18212c;
        color: #aeb8c3;
        font-weight: 400;
        position: sticky;
        top: 0;
      }

      .history-table td:last-child {
        white-space: nowrap;
      }

      .history-unit {
        font-size: 0.68em;
        padding-left: 1px;
      }

      .history-correction-field {
        gap: 12px;
      }

      .history-time-input {
        grid-template-columns: repeat(3, max-content);
      }

      .export-icon {
        color: #b7b7b7;
        cursor: pointer;
        flex: 0 0 auto;
        height: 24px;
        transition: color 140ms ease;
        width: 24px;
      }

      .export-icon:hover,
      .export-icon:focus-visible {
        color: #ffffff;
        outline: none;
      }

      .modal-backdrop {
        align-items: center;
        background: rgba(0, 0, 0, 0.68);
        display: flex;
        inset: 0;
        justify-content: center;
        padding: 20px;
        position: fixed;
        z-index: 50;
      }

      .confirmation-modal {
        background: #121a24;
        border: 1px solid #3b4857;
        border-radius: 8px;
        box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5);
        max-width: 420px;
        padding: 22px;
        width: 100%;
      }

      .confirmation-modal h2 {
        font-size: 1.1rem;
        font-weight: 400;
        margin: 0 0 14px;
      }

      .confirmation-modal p {
        line-height: 1.6;
        margin: 0 0 22px;
      }

      .modal-progress-field {
        margin-bottom: 22px;
      }

      .modal-actions {
        display: flex;
        gap: 10px;
        justify-content: flex-end;
      }

      .modal-actions button {
        border-radius: 6px;
        cursor: pointer;
        font: inherit;
        min-width: 88px;
        padding: 8px 14px;
      }

      .modal-cancel-button {
        background: #1a2430;
        border: 1px solid #435162;
        color: #e8edf2;
      }

      .modal-confirm-button {
        background: #2d6f68;
        border: 1px solid #3d817a;
        color: #ffffff;
      }

      .modal-confirm-button:disabled {
        background: #26333a;
        border-color: #35444c;
        color: #71808a;
        cursor: not-allowed;
      }

      .progress-control {
        align-items: center;
        display: grid;
        gap: 10px;
        grid-template-columns: minmax(0, 1fr) 88px;
      }

      .progress-control .progress-range {
        appearance: none;
        background: transparent;
        border: 0;
        cursor: pointer;
        height: 24px;
        padding: 0;
      }

      .progress-control .progress-range::-webkit-slider-runnable-track {
        background: #34434d;
        border-radius: 999px;
        height: 12px;
      }

      .progress-control .progress-range::-webkit-slider-thumb {
        appearance: none;
        background: #62a69e;
        border: 2px solid #9acbc5;
        border-radius: 50%;
        box-sizing: border-box;
        height: 24px;
        margin-top: -6px;
        width: 24px;
      }

      .progress-control .progress-range::-moz-range-track {
        background: #34434d;
        border-radius: 999px;
        height: 12px;
      }

      .progress-control .progress-range::-moz-range-thumb {
        background: #62a69e;
        border: 2px solid #9acbc5;
        border-radius: 50%;
        box-sizing: border-box;
        height: 24px;
        width: 24px;
      }

      .progress-number {
        align-items: center;
        color: #e8edf2;
        display: grid;
        gap: 4px;
        grid-template-columns: minmax(0, 1fr) max-content;
      }

      .progress-number > span {
        font-size: 1rem;
        line-height: 1.25;
      }

      .progress-number input {
        box-sizing: border-box;
        font-size: 1rem;
        padding: 8px;
        text-align: center;
      }

      .priority-segments {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
      }

      .priority-segments button {
        background: #121a24;
        border: 1px solid #33404d;
        color: #e8edf2;
        cursor: pointer;
        font: inherit;
        min-height: 36px;
        padding: 7px 8px;
      }

      .priority-segments button:first-child {
        border-radius: 6px 0 0 6px;
      }

      .priority-segments button:last-child {
        border-radius: 0 6px 6px 0;
      }

      .priority-segments button + button {
        border-left: 0;
      }

      .priority-segments .active {
        background: #2d6f68;
        border-color: #3d817a;
        color: #ffffff;
      }

      .priority-segments button:nth-child(2).active {
        background: #756019;
        border-color: #927925;
      }

      .priority-segments button:nth-child(3).active {
        background: #79343b;
        border-color: #98454e;
      }

    `
  ]
})
export class TaskListNormalMockComponent {
  private readonly minutesPerHour = 60;
  private readonly minutesPerDay = 480;
  selectedTaskId: string | null = null;
  confirmationMessage: string | null = null;
  confirmationMode: 'confirm' | 'reopen' = 'confirm';
  modalProgress = 100;
  private pendingConfirmation: (() => void) | null = null;
  private confirmationTask: MockTask | null = null;
  private draftProgress: { taskId: string; value: number } | null = null;
  private textareaResize: {
    pointerId: number;
    textarea: HTMLTextAreaElement;
    startHeight: number;
    startY: number;
  } | null = null;
  actualAddition: Record<TimeUnit, number> = { days: 0, hours: 0, minutes: 0 };
  actualCorrection: Record<TimeUnit, number> = { days: 0, hours: 0, minutes: 0 };
  actualHistoryTaskId: string | null = null;
  dateTimePopoverTaskId: string | null = null;
  dateTimeDraft: DateTimeDraft | null = null;
  calendarYear = new Date().getFullYear();
  calendarMonth = new Date().getMonth();
  private readonly actualHistoryEntries = this.createInitialActualHistory();

  readonly weekdays = ['日', '月', '火', '水', '木', '金', '土'] as const;
  readonly hours = Array.from({ length: 24 }, (_, hour) => hour);
  readonly minuteOptions = Array.from({ length: 12 }, (_, index) => index * 5);

  readonly timeUnits: readonly { key: TimeUnit; label: string; steps: readonly number[] }[] = [
    { key: 'days', label: '日', steps: [1, 2, 3, 4, 5, 7, 10, 15, 20] },
    { key: 'hours', label: '時間', steps: [1, 2, 3, 4, 5, 6, 7] },
    { key: 'minutes', label: '分', steps: [5, 10, 15, 20, 30, 45] }
  ];

  readonly tasks: MockTask[] = [
    {
      id: 'todo-a',
      name: 'TODO a',
      kind: 'todo',
      depth: 0,
      completed: false,
      expanded: true,
      hasChildren: true,
      priority: 'none',
      exportFlag: true
    },
    {
      id: 'todo-a1',
      name: 'TODO a1',
      kind: 'todo',
      depth: 1,
      completed: false,
      expanded: true,
      hasChildren: true,
      priority: 'none',
      exportFlag: true
    },
    {
      id: 'todo-a1-1',
      name: 'TODO a1-1',
      kind: 'todo',
      depth: 2,
      completed: false,
      expanded: true,
      hasChildren: true,
      priority: 'none',
      exportFlag: true
    },
    {
      id: 'todo-a1-1-1',
      name: 'TODO a1-1-1の実際の名前がここには入り横幅の検討のためにわざと冗長に書いているがろくに何も書けず困る',
      kind: 'todo',
      depth: 3,
      completed: true,
      priority: 'none',
      eventLabel: '〜2日まえ',
      eventAt: '2026-07-16T18:00',
      estimated: '3時間',
      actual: '2時間30分',
      progress: '100%',
      exportFlag: true,
      lastDoneAt: '2026/07/11',
      preInfo: '内容：横幅が足りない場合の見え方を確認する。\n\n一覧と詳細パネルを並べたときの情報量を確認し、長い文章でも操作しやすい配置を検討する。',
      notes: '結論：ノートのプレビューに取り消し線は不要。\n\n完了済みのタスクでもノートは記録として読み返すため、本文の視認性を保つ。\n今のところは指摘なし。',
      reflection: ''
    },
    {
      id: 'todo-a1-1-2',
      name: 'TODO a1-1-2の実際の名前がここに入るのだが書けることがやっぱり無さそうでいささか困る',
      kind: 'todo',
      depth: 3,
      completed: false,
      priority: 'highest',
      eventLabel: '〜18:00',
      eventAt: '2026-07-18T18:00',
      estimated: '1日',
      actual: '5時間',
      progress: '70%',
      exportFlag: true,
      lastDoneAt: '2026/07/12',
      preInfo: '目的：事前情報のプレビューがここに表示されるわけだがこんな小さい文字でも大丈夫なのかを調べる。\n\nノートが空欄の場合にも作業前の要点を一覧から把握できることを確認する。\n他にもやるべきことがないか確認中。',
      notes: '',
      reflection: ''
    },
    {
      id: 'todo-a1-1-3',
      name: 'TODO a1-1-3の実際の名前がここに入るがわざと冗長に書いているんだ',
      kind: 'todo',
      depth: 3,
      completed: false,
      priority: 'priority',
      eventLabel: '〜明日15:00',
      eventAt: '2026-07-19T15:00',
      estimated: '30分',
      actual: '10分',
      progress: '50%',
      exportFlag: false,
      lastDoneAt: '2026/07/10',
      notes: '',
      reflection: ''
    },
    {
      id: 'todo-a1-20',
      name: 'TODO a1-20の実際の名前がここには入るんですよ',
      kind: 'todo',
      depth: 2,
      completed: false,
      priority: 'none',
      progress: '20%'
    },
    {
      id: 'schedule-a2',
      name: '予定a2の実際の名前',
      kind: 'schedule',
      depth: 1,
      completed: true,
      priority: 'none',
      schedulePrefix: '10:00〜',
      eventAt: '2026-07-18T10:00',
      progress: '100%',
      exportFlag: false,
      lastDoneAt: '2026/07/12'
    },
    {
      id: 'schedule-a3',
      name: '予定a3の実際の名前',
      kind: 'schedule',
      depth: 1,
      completed: false,
      priority: 'none',
      schedulePrefix: '明日11:00〜',
      eventAt: '2026-07-19T11:00',
      estimated: '1時間',
      actual: '0分',
      progress: '0%',
      exportFlag: true
    },
    {
      id: 'todo-a4',
      name: 'TODO a4の実際の名前だよ',
      kind: 'todo',
      depth: 1,
      completed: false,
      expanded: true,
      hasChildren: true,
      priority: 'none',
      eventLabel: '〜木17:00',
      estimated: '2時間',
      actual: '30分',
      progress: '15%',
      exportFlag: false
    },
    {
      id: 'todo-a4-1',
      name: 'TODO a4-1',
      kind: 'todo',
      depth: 2,
      completed: true,
      priority: 'none'
    },
    {
      id: 'todo-a4-2',
      name: 'TODO a4-2',
      kind: 'todo',
      depth: 2,
      completed: false,
      priority: 'none'
    },
    {
      id: 'todo-b',
      name: 'TODO b',
      kind: 'todo',
      depth: 0,
      completed: false,
      expanded: true,
      hasChildren: true,
      priority: 'none',
      exportFlag: true
    },
    {
      id: 'todo-b1',
      name: 'TODO b1',
      kind: 'todo',
      depth: 1,
      completed: true,
      priority: 'none'
    },
    {
      id: 'todo-b2',
      name: 'TODO b2',
      kind: 'todo',
      depth: 1,
      completed: false,
      expanded: true,
      hasChildren: true,
      priority: 'none',
      exportFlag: true
    },
    {
      id: 'todo-b2-1',
      name: 'TODO b2-1',
      kind: 'todo',
      depth: 2,
      completed: true,
      priority: 'none',
      exportFlag: true
    },
    {
      id: 'todo-b2-2',
      name: 'TODO b2-2',
      kind: 'todo',
      depth: 2,
      completed: true,
      priority: 'none',
      exportFlag: true
    },
    {
      id: 'todo-b2-3',
      name: 'TODO b2-3',
      kind: 'todo',
      depth: 2,
      completed: false,
      priority: 'none',
      exportFlag: true
    },
    {
      id: 'todo-b2-4',
      name: 'TODO b2-4',
      kind: 'todo',
      depth: 2,
      completed: false,
      priority: 'none',
      exportFlag: true
    },
    {
      id: 'todo-b2-5',
      name: 'TODO b2-5',
      kind: 'todo',
      depth: 2,
      completed: false,
      priority: 'none',
      exportFlag: true
    },
    {
      id: 'todo-b2-6',
      name: 'TODO b2-6',
      kind: 'todo',
      depth: 2,
      completed: false,
      priority: 'none',
      exportFlag: true
    },
    {
      id: 'todo-b2-7',
      name: 'TODO b2-7',
      kind: 'todo',
      depth: 2,
      completed: false,
      priority: 'none',
      exportFlag: true
    },
    {
      id: 'todo-b2-8',
      name: 'TODO b2-8',
      kind: 'todo',
      depth: 2,
      completed: false,
      priority: 'none',
      exportFlag: true
    },
    {
      id: 'todo-b2-9',
      name: 'TODO b2-9',
      kind: 'todo',
      depth: 2,
      completed: false,
      priority: 'none',
      exportFlag: true
    }
  ];

  toggleDetail(taskId: string): void {
    this.resetProgressDraft();
    this.resetActualAddition();
    this.closeDateTimePopover();
    this.selectedTaskId = this.selectedTaskId === taskId ? null : taskId;
  }

  handleRowClick(task: MockTask, event: MouseEvent): void {
    event.stopPropagation();
    const row = event.currentTarget as HTMLElement;
    const protectedWidth = task.depth * 52 + 42;
    if (event.clientX - row.getBoundingClientRect().left <= protectedWidth) {
      return;
    }
    this.toggleDetail(task.id);
  }

  clearSelection(): void {
    this.resetProgressDraft();
    this.resetActualAddition();
    this.closeDateTimePopover();
    this.selectedTaskId = null;
  }

  selectedTask(): MockTask | null {
    return this.tasks.find((task) => task.id === this.selectedTaskId) ?? null;
  }

  visibleTasks(): MockTask[] {
    const visible: MockTask[] = [];
    let collapsedDepth: number | null = null;

    for (const task of this.tasks) {
      if (collapsedDepth !== null) {
        if (task.depth > collapsedDepth) {
          continue;
        }
        collapsedDepth = null;
      }

      visible.push(task);

      if (task.hasChildren && !task.expanded) {
        collapsedDepth = task.depth;
      }
    }

    return visible;
  }

  taskPreview(task: MockTask): string | null {
    const hasNotes = !!task.notes?.trim();
    const source = hasNotes ? task.notes : task.preInfo;
    if (!source?.trim()) {
      return null;
    }
    const prefix = hasNotes ? '→ ' : '… ';
    return `${prefix}${source.trim().split(/\r?\n/, 1)[0]}`;
  }

  changeContent(task: MockTask, field: ContentField, event: Event): void {
    task[field] = (event.target as HTMLTextAreaElement).value;
  }

  startTextareaResize(textarea: HTMLTextAreaElement, event: PointerEvent): void {
    event.preventDefault();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.textareaResize = {
      pointerId: event.pointerId,
      textarea,
      startHeight: textarea.getBoundingClientRect().height,
      startY: event.clientY
    };
  }

  resizeTextarea(event: PointerEvent): void {
    if (!this.textareaResize || this.textareaResize.pointerId !== event.pointerId) {
      return;
    }
    const nextHeight = Math.max(132, this.textareaResize.startHeight + event.clientY - this.textareaResize.startY);
    this.textareaResize.textarea.style.height = `${nextHeight}px`;
  }

  endTextareaResize(event: PointerEvent): void {
    if (!this.textareaResize || this.textareaResize.pointerId !== event.pointerId) {
      return;
    }
    const handle = event.currentTarget as HTMLElement;
    if (handle.hasPointerCapture(event.pointerId)) {
      handle.releasePointerCapture(event.pointerId);
    }
    this.textareaResize = null;
  }

  resizeTextareaWithKeyboard(textarea: HTMLTextAreaElement, event: KeyboardEvent): void {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') {
      return;
    }
    event.preventDefault();
    const direction = event.key === 'ArrowDown' ? 1 : -1;
    const step = event.shiftKey ? 48 : 16;
    const nextHeight = Math.max(132, textarea.getBoundingClientRect().height + direction * step);
    textarea.style.height = `${nextHeight}px`;
  }

  changeTaskName(task: MockTask, event: Event): void {
    const input = event.currentTarget as HTMLElement;
    const name = (input.textContent ?? '').replace(/\s*\r?\n\s*/g, ' ');
    if (input.textContent !== name) {
      input.textContent = name;
    }
    task.name = name;
  }

  preventTaskNameLineBreak(event: Event): void {
    const inputEvent = event as InputEvent;
    if (inputEvent.inputType === 'insertParagraph' || inputEvent.inputType === 'insertLineBreak') {
      event.preventDefault();
    }
  }

  toggleChildren(task: MockTask, event: MouseEvent): void {
    event.stopPropagation();
    if (!task.hasChildren) {
      return;
    }
    task.expanded = !task.expanded;
  }

  toggleCompleted(task: MockTask, event: MouseEvent): void {
    event.stopPropagation();
    if (!task.completed) {
      this.openConfirmation('進捗が100％となりますがよろしいですか？', () => this.applyProgress(task, 100));
      return;
    }
    this.openReopenConfirmation(task);
  }

  previewProgress(task: MockTask, event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    if (this.isValidProgress(value)) {
      this.draftProgress = { taskId: task.id, value };
    }
  }

  commitProgress(task: MockTask, event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.valueAsNumber;
    if (!this.isValidProgress(value)) {
      this.resetProgressDraft();
      input.value = String(this.progressValue(task));
      return;
    }

    this.draftProgress = { taskId: task.id, value };
    this.applyProgress(task, value);
  }

  toggleExportFlag(task: MockTask, event?: Event): void {
    event?.stopPropagation();
    if (!task.exportFlag) {
      this.enableExportWithAncestors(task);
      return;
    }

    const visibleDescendants = this.descendantsOf(task).filter((descendant) => descendant.exportFlag);
    if (visibleDescendants.length === 0) {
      task.exportFlag = false;
      return;
    }

    this.openConfirmation(
      '子孫タスクも日報出力対象外にする必要がありますがよろしいですか？',
      () => {
        task.exportFlag = false;
        for (const descendant of this.descendantsOf(task)) {
          descendant.exportFlag = false;
        }
      }
    );
  }

  changeTaskKind(task: MockTask, kind: TaskKind): void {
    task.kind = kind;
  }

  changePriority(task: MockTask, priority: Priority): void {
    task.priority = priority;
  }

  eventAtDisplay(task: MockTask): string {
    if (!task.eventAt) {
      return '日時を選択';
    }
    const match = task.eventAt.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (!match) {
      return task.eventAt;
    }
    return `${match[1]}/${match[2]}/${match[3]} ${match[4]}:${match[5]}`;
  }

  toggleDateTimePopover(task: MockTask, event: Event): void {
    event.stopPropagation();
    if (this.dateTimePopoverTaskId === task.id) {
      this.closeDateTimePopover();
      return;
    }
    const initialDate = this.parseEventAt(task.eventAt) ?? this.roundToFiveMinutes(new Date());
    this.dateTimeDraft = this.dateToDraft(initialDate);
    this.calendarYear = initialDate.getFullYear();
    this.calendarMonth = initialDate.getMonth();
    this.dateTimePopoverTaskId = task.id;
    setTimeout(() => this.centerSelectedTimeOptions());
  }

  closeDateTimePopover(): void {
    this.dateTimePopoverTaskId = null;
    this.dateTimeDraft = null;
  }

  calendarMonthLabel(): string {
    return `${this.calendarYear}年 ${this.calendarMonth + 1}月`;
  }

  calendarCells(): (number | null)[] {
    const firstWeekday = new Date(this.calendarYear, this.calendarMonth, 1).getDay();
    const daysInMonth = new Date(this.calendarYear, this.calendarMonth + 1, 0).getDate();
    return [
      ...Array.from({ length: firstWeekday }, () => null),
      ...Array.from({ length: daysInMonth }, (_, index) => index + 1)
    ];
  }

  moveCalendarMonth(offset: number): void {
    const nextMonth = new Date(this.calendarYear, this.calendarMonth + offset, 1);
    this.calendarYear = nextMonth.getFullYear();
    this.calendarMonth = nextMonth.getMonth();
  }

  selectCalendarDay(day: number): void {
    if (!this.dateTimeDraft) {
      return;
    }
    this.dateTimeDraft = {
      ...this.dateTimeDraft,
      year: this.calendarYear,
      month: this.calendarMonth,
      day
    };
  }

  isDraftDay(day: number): boolean {
    return !!this.dateTimeDraft
      && this.dateTimeDraft.year === this.calendarYear
      && this.dateTimeDraft.month === this.calendarMonth
      && this.dateTimeDraft.day === day;
  }

  isToday(day: number): boolean {
    const today = new Date();
    return today.getFullYear() === this.calendarYear
      && today.getMonth() === this.calendarMonth
      && today.getDate() === day;
  }

  calendarDayLabel(day: number): string {
    return `${this.calendarYear}年${this.calendarMonth + 1}月${day}日`;
  }

  setDraftToday(): void {
    if (!this.dateTimeDraft) {
      return;
    }
    const today = new Date();
    this.calendarYear = today.getFullYear();
    this.calendarMonth = today.getMonth();
    this.dateTimeDraft = {
      ...this.dateTimeDraft,
      year: today.getFullYear(),
      month: today.getMonth(),
      day: today.getDate()
    };
  }

  setDraftCurrentTime(): void {
    if (!this.dateTimeDraft) {
      return;
    }
    const current = this.roundToFiveMinutes(new Date());
    this.dateTimeDraft = {
      ...this.dateTimeDraft,
      hour: current.getHours(),
      minute: current.getMinutes()
    };
    setTimeout(() => this.centerSelectedTimeOptions());
  }

  selectDraftHour(hour: number, event: Event): void {
    if (!this.dateTimeDraft) {
      return;
    }
    this.dateTimeDraft = { ...this.dateTimeDraft, hour };
    this.centerTimeOption(event.currentTarget as HTMLElement);
  }

  selectDraftMinute(minute: number, event: Event): void {
    if (!this.dateTimeDraft) {
      return;
    }
    this.dateTimeDraft = { ...this.dateTimeDraft, minute };
    this.centerTimeOption(event.currentTarget as HTMLElement);
  }

  changeDraftFromDrum(part: 'hour' | 'minute', event: Event): void {
    if (!this.dateTimeDraft) {
      return;
    }
    const drum = event.currentTarget as HTMLElement;
    const optionIndex = Math.round(drum.scrollTop / 48);
    const value = part === 'hour'
      ? this.hours[Math.min(optionIndex, this.hours.length - 1)]
      : this.minuteOptions[Math.min(optionIndex, this.minuteOptions.length - 1)];
    if (value === undefined || this.dateTimeDraft[part] === value) {
      return;
    }
    this.dateTimeDraft = { ...this.dateTimeDraft, [part]: value };
  }

  clearDateTime(task: MockTask): void {
    task.eventAt = undefined;
    task.eventLabel = undefined;
    this.closeDateTimePopover();
  }

  confirmDateTime(task: MockTask): void {
    if (!this.dateTimeDraft) {
      return;
    }
    const { year, month, day, hour, minute } = this.dateTimeDraft;
    const date = new Date(year, month, day, hour, minute);
    if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
      return;
    }
    task.eventAt = this.formatLocalDateTime(date);
    this.closeDateTimePopover();
  }

  padNumber(value: number): string {
    return String(value).padStart(2, '0');
  }

  timePart(value: string | undefined, unit: TimeUnit): number {
    return this.timeParts(value)[unit];
  }

  timeStepIndex(value: string | undefined, unit: TimeUnit): number {
    const part = this.timePart(value, unit);
    if (part === 0) {
      return 0;
    }
    return this.stepsFor(unit).indexOf(this.snapTimeValue(part, unit)) + 1;
  }

  changeTimeSlider(task: MockTask, field: TimeField, unit: TimeUnit, event: Event): void {
    const index = Number((event.target as HTMLInputElement).value);
    const steps = this.stepsFor(unit);
    const value = index === 0 ? 0 : (steps[index - 1] ?? steps[steps.length - 1]);
    this.updateTimePart(task, field, unit, value);
  }

  changeTimeNumber(task: MockTask, field: TimeField, unit: TimeUnit, event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.valueAsNumber;
    if (!Number.isInteger(value) || value < 0) {
      input.value = String(this.timePart(task[field], unit));
      return;
    }
    this.updateTimePart(task, field, unit, value);
  }

  actualAdditionStepIndex(unit: TimeUnit): number {
    const value = this.actualAddition[unit];
    if (value === 0) {
      return 0;
    }
    return this.stepsFor(unit).indexOf(this.snapTimeValue(value, unit)) + 1;
  }

  changeActualAdditionSlider(unit: TimeUnit, event: Event): void {
    const index = Number((event.target as HTMLInputElement).value);
    const steps = this.stepsFor(unit);
    this.actualAddition[unit] = index === 0 ? 0 : (steps[index - 1] ?? steps[steps.length - 1]);
  }

  changeActualAdditionNumber(unit: TimeUnit, event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.valueAsNumber;
    if (!Number.isInteger(value) || value < 0) {
      input.value = String(this.actualAddition[unit]);
      return;
    }
    this.actualAddition[unit] = this.snapTimeValue(value, unit);
  }

  actualAdditionIsZero(): boolean {
    return this.totalMinutes(this.actualAddition) === 0;
  }

  addActualTime(task: MockTask): void {
    if (this.actualAdditionIsZero()) {
      return;
    }
    const addedMinutes = this.totalMinutes(this.actualAddition);
    const total = this.totalMinutes(this.timeParts(task.actual)) + addedMinutes;
    task.actual = this.formatTime(this.partsFromTotalMinutes(total));
    this.appendActualHistory(task, '追加', addedMinutes, total);
    this.resetActualAddition();
  }

  openActualHistory(task: MockTask): void {
    this.actualHistoryTaskId = task.id;
    this.actualCorrection = { ...this.timeParts(task.actual) };
  }

  closeActualHistory(event?: Event): void {
    event?.stopPropagation();
    this.actualHistoryTaskId = null;
    this.actualCorrection = { days: 0, hours: 0, minutes: 0 };
  }

  actualHistoryTask(): MockTask | null {
    return this.tasks.find((task) => task.id === this.actualHistoryTaskId) ?? null;
  }

  actualHistoryFor(task: MockTask): ActualHistoryRow[] {
    return this.buildActualHistoryRows(this.actualHistoryEntries.get(task.id) ?? []);
  }

  actualCorrectionStepIndex(unit: TimeUnit): number {
    const value = this.actualCorrection[unit];
    if (value === 0) {
      return 0;
    }
    return this.stepsFor(unit).indexOf(this.snapTimeValue(value, unit)) + 1;
  }

  changeActualCorrectionSlider(unit: TimeUnit, event: Event): void {
    const index = Number((event.target as HTMLInputElement).value);
    const steps = this.stepsFor(unit);
    this.actualCorrection[unit] = index === 0 ? 0 : (steps[index - 1] ?? steps[steps.length - 1]);
  }

  changeActualCorrectionNumber(unit: TimeUnit, event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.valueAsNumber;
    if (!Number.isInteger(value) || value < 0) {
      input.value = String(this.actualCorrection[unit]);
      return;
    }
    this.actualCorrection[unit] = value;
  }

  actualCorrectionChanged(task: MockTask): boolean {
    return this.totalMinutes(this.actualCorrection) !== this.totalMinutes(this.timeParts(task.actual));
  }

  applyActualCorrection(task: MockTask, event?: Event): void {
    event?.stopPropagation();
    if (!this.actualCorrectionChanged(task)) {
      return;
    }
    const previousMinutes = this.totalMinutes(this.timeParts(task.actual));
    const correctedMinutes = this.totalMinutes(this.actualCorrection);
    task.actual = this.formatTime(this.partsFromTotalMinutes(correctedMinutes));
    this.appendActualHistory(task, '修正', correctedMinutes - previousMinutes, correctedMinutes);
    this.closeActualHistory();
  }

  confirmPendingAction(): void {
    if (this.confirmationMode === 'reopen') {
      if (this.modalProgress >= 100 || !this.confirmationTask) {
        return;
      }
      this.applyProgress(this.confirmationTask, this.modalProgress);
      this.closeConfirmation();
      return;
    }
    this.pendingConfirmation?.();
    this.closeConfirmation();
  }

  changeModalProgress(event: Event): void {
    const value = (event.target as HTMLInputElement).valueAsNumber;
    if (this.isValidProgress(value)) {
      this.modalProgress = value;
    }
  }

  cancelConfirmation(): void {
    this.closeConfirmation();
  }

  private applyProgress(task: MockTask, value: number): void {
    task.progress = `${value}%`;
    task.completed = value === 100;
    this.resetProgressDraft();
  }

  private descendantsOf(task: MockTask): MockTask[] {
    const taskIndex = this.tasks.indexOf(task);
    if (taskIndex < 0) {
      return [];
    }

    const descendants: MockTask[] = [];
    for (let index = taskIndex + 1; index < this.tasks.length; index += 1) {
      const candidate = this.tasks[index];
      if (candidate.depth <= task.depth) {
        break;
      }
      descendants.push(candidate);
    }
    return descendants;
  }

  private enableExportWithAncestors(task: MockTask): void {
    task.exportFlag = true;
    let ancestorDepth = task.depth - 1;
    const taskIndex = this.tasks.indexOf(task);

    for (let index = taskIndex - 1; index >= 0 && ancestorDepth >= 0; index -= 1) {
      const candidate = this.tasks[index];
      if (candidate.depth === ancestorDepth) {
        candidate.exportFlag = true;
        ancestorDepth -= 1;
      }
    }
  }

  private openConfirmation(message: string, action: () => void): void {
    this.confirmationMode = 'confirm';
    this.confirmationMessage = message;
    this.pendingConfirmation = action;
  }

  private openReopenConfirmation(task: MockTask): void {
    this.confirmationMode = 'reopen';
    this.confirmationMessage = '進捗を100％未満にする必要があります';
    this.confirmationTask = task;
    this.modalProgress = this.progressValue(task);
  }

  private closeConfirmation(): void {
    this.confirmationMessage = null;
    this.confirmationMode = 'confirm';
    this.confirmationTask = null;
    this.modalProgress = 100;
    this.pendingConfirmation = null;
    this.resetProgressDraft();
  }

  private resetProgressDraft(): void {
    this.draftProgress = null;
  }

  private resetActualAddition(): void {
    this.actualAddition = { days: 0, hours: 0, minutes: 0 };
  }

  private appendActualHistory(
    task: MockTask,
    operation: ActualHistoryEntry['operation'],
    deltaMinutes: number,
    cumulativeMinutes: number
  ): void {
    const entries = this.actualHistoryEntries.get(task.id) ?? [];
    entries.push({ recordedAt: new Date(), operation, deltaMinutes, cumulativeMinutes });
    this.actualHistoryEntries.set(task.id, entries);
  }

  private createInitialActualHistory(): Map<string, ActualHistoryEntry[]> {
    return new Map<string, ActualHistoryEntry[]>([
      ['todo-a1-1-1', [
        { recordedAt: this.dateAtDayOffset(-2, 10, 0), operation: '追加', deltaMinutes: 120, cumulativeMinutes: 120 },
        { recordedAt: this.dateAtDayOffset(-1, 9, 30), operation: '追加', deltaMinutes: 45, cumulativeMinutes: 165 },
        { recordedAt: this.dateAtDayOffset(-1, 16, 15), operation: '修正', deltaMinutes: -15, cumulativeMinutes: 150 }
      ]],
      ['todo-a1-1-2', [
        { recordedAt: this.dateAtDayOffset(-2, 11, 0), operation: '追加', deltaMinutes: 120, cumulativeMinutes: 120 },
        { recordedAt: this.dateAtDayOffset(-1, 10, 0), operation: '追加', deltaMinutes: 120, cumulativeMinutes: 240 },
        { recordedAt: this.dateAtDayOffset(-1, 15, 0), operation: '追加', deltaMinutes: 60, cumulativeMinutes: 300 }
      ]],
      ['todo-a1-1-3', [
        { recordedAt: this.dateAtDayOffset(-1, 9, 40), operation: '追加', deltaMinutes: 30, cumulativeMinutes: 30 },
        { recordedAt: this.dateAtDayOffset(-1, 17, 10), operation: '修正', deltaMinutes: -20, cumulativeMinutes: 10 }
      ]]
    ]);
  }

  /**
   * 当日の操作は追加・修正のたびに時刻付きで明細表示する。
   * 前日以前の操作は、翌日以降に日単位で「追加」「修正」それぞれの増減を合計し、
   * 同じ日の操作を1行へまとめる。本実装へ移行するときも、生の操作履歴は保持したまま
   * 表示時にこの集約を行い、過去日の個々の操作を失わないようにする。
   */
  private buildActualHistoryRows(entries: ActualHistoryEntry[]): ActualHistoryRow[] {
    const sortedEntries = [...entries].sort((left, right) => left.recordedAt.getTime() - right.recordedAt.getTime());
    const todayKey = this.localDateKey(new Date());
    const rows: ActualHistoryRow[] = [];
    const pastEntriesByDate = new Map<string, ActualHistoryEntry[]>();

    for (const entry of sortedEntries) {
      const dateKey = this.localDateKey(entry.recordedAt);
      if (dateKey === todayKey) {
        rows.push({
          when: this.formatHistoryDateTime(entry.recordedAt),
          operation: `${entry.operation}: ${this.formatSignedDuration(entry.deltaMinutes)}`,
          cumulative: this.formatTime(this.partsFromTotalMinutes(entry.cumulativeMinutes))
        });
        continue;
      }
      const dailyEntries = pastEntriesByDate.get(dateKey) ?? [];
      dailyEntries.push(entry);
      pastEntriesByDate.set(dateKey, dailyEntries);
    }

    const pastRows = [...pastEntriesByDate.entries()].map(([dateKey, dailyEntries]) => {
      const additions = dailyEntries
        .filter((entry) => entry.operation === '追加')
        .reduce((total, entry) => total + entry.deltaMinutes, 0);
      const corrections = dailyEntries
        .filter((entry) => entry.operation === '修正')
        .reduce((total, entry) => total + entry.deltaMinutes, 0);
      const operations = [
        additions !== 0 ? `追加: ${this.formatSignedDuration(additions)}` : null,
        corrections !== 0 ? `修正: ${this.formatSignedDuration(corrections)}` : null
      ].filter((operation): operation is string => operation !== null);
      const cumulativeMinutes = dailyEntries[dailyEntries.length - 1].cumulativeMinutes;
      return {
        dateKey,
        row: {
          when: this.formatHistoryDate(dailyEntries[0].recordedAt),
          operation: operations.join(' / '),
          cumulative: this.formatTime(this.partsFromTotalMinutes(cumulativeMinutes))
        }
      };
    });

    return [
      ...pastRows.sort((left, right) => left.dateKey.localeCompare(right.dateKey)).map(({ row }) => row),
      ...rows
    ];
  }

  private formatSignedDuration(minutes: number): string {
    const sign = minutes >= 0 ? '+' : '-';
    return `${sign}${this.formatTime(this.partsFromTotalMinutes(Math.abs(minutes)))}`;
  }

  private dateAtDayOffset(dayOffset: number, hours: number, minutes: number): Date {
    const date = new Date();
    date.setDate(date.getDate() + dayOffset);
    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  private localDateKey(date: Date): string {
    const pad = (part: number): string => String(part).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  private formatHistoryDate(date: Date): string {
    return this.localDateKey(date).replaceAll('-', '/');
  }

  private formatHistoryDateTime(date: Date): string {
    const pad = (part: number): string => String(part).padStart(2, '0');
    return `${this.formatHistoryDate(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  private parseEventAt(value: string | undefined): Date | null {
    const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (!match) {
      return null;
    }
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private roundToFiveMinutes(value: Date): Date {
    const rounded = new Date(value);
    rounded.setSeconds(0, 0);
    rounded.setMinutes(Math.round(rounded.getMinutes() / 5) * 5);
    return rounded;
  }

  private dateToDraft(date: Date): DateTimeDraft {
    return {
      year: date.getFullYear(),
      month: date.getMonth(),
      day: date.getDate(),
      hour: date.getHours(),
      minute: date.getMinutes()
    };
  }

  private formatLocalDateTime(date: Date): string {
    return `${date.getFullYear()}-${this.padNumber(date.getMonth() + 1)}-${this.padNumber(date.getDate())}T${this.padNumber(date.getHours())}:${this.padNumber(date.getMinutes())}`;
  }

  private centerSelectedTimeOptions(): void {
    document.querySelectorAll<HTMLElement>('.date-time-popover .time-drum button.selected').forEach((option) => {
      this.centerTimeOption(option);
    });
  }

  private centerTimeOption(option: HTMLElement): void {
    const drum = option.parentElement;
    if (!drum) {
      return;
    }
    drum.scrollTo({ top: option.offsetTop - (drum.clientHeight - option.offsetHeight) / 2, behavior: 'smooth' });
  }

  private isValidProgress(value: number): boolean {
    return Number.isInteger(value) && value >= 0 && value <= 100;
  }

  private updateTimePart(task: MockTask, field: TimeField, unit: TimeUnit, value: number): void {
    const parts = this.timeParts(task[field]);
    parts[unit] = this.snapTimeValue(value, unit);
    task[field] = this.formatTime(parts);
  }

  private timeParts(value: string | undefined): Record<TimeUnit, number> {
    const days = Number(value?.match(/(\d+)日/)?.[1] ?? 0);
    const hours = Number(value?.match(/(\d+)時間/)?.[1] ?? 0);
    const minutes = Number(value?.match(/(\d+)分/)?.[1] ?? 0);
    return { minutes, hours, days };
  }

  private stepsFor(unit: TimeUnit): readonly number[] {
    return this.timeUnits.find((candidate) => candidate.key === unit)?.steps ?? [];
  }

  private snapTimeValue(value: number, unit: TimeUnit): number {
    if (value === 0) {
      return 0;
    }
    return this.stepsFor(unit).reduce((nearest, step) => {
      const distance = Math.abs(value - step);
      const nearestDistance = Math.abs(value - nearest);
      return distance < nearestDistance || (distance === nearestDistance && step < nearest) ? step : nearest;
    });
  }

  private formatTime(parts: Record<TimeUnit, number>): string {
    const totalMinutes = this.totalMinutes(parts);
    if (totalMinutes === 0) {
      return '0分';
    }
    return `${parts.days ? `${parts.days}日` : ''}${parts.hours ? `${parts.hours}時間` : ''}${parts.minutes ? `${parts.minutes}分` : ''}`;
  }

  private totalMinutes(parts: Record<TimeUnit, number>): number {
    return parts.days * this.minutesPerDay + parts.hours * this.minutesPerHour + parts.minutes;
  }

  private partsFromTotalMinutes(totalMinutes: number): Record<TimeUnit, number> {
    const days = Math.floor(totalMinutes / this.minutesPerDay);
    const afterDays = totalMinutes % this.minutesPerDay;
    const hours = Math.floor(afterDays / this.minutesPerHour);
    const minutes = afterDays % this.minutesPerHour;
    return { days, hours, minutes };
  }

  metricParts(value: string | undefined): { text: string; unit: boolean }[] {
    if (!value) {
      return [];
    }
    return value
      .split(/(時間|日|分|%|％)/)
      .filter((text) => text.length > 0)
      .map((text) => ({
        text,
        unit: ['日', '時間', '分', '%', '％'].includes(text)
      }));
  }

  listTimeMetricParts(value: string | undefined): { text: string; unit: boolean }[] {
    if (!value || this.totalMinutes(this.timeParts(value)) === 0) {
      return [];
    }
    return this.metricParts(value);
  }

  progressValue(task: MockTask): number {
    if (!task.progress) {
      return task.completed ? 100 : 0;
    }
    const value = Number(task.progress.replace('%', ''));
    return Number.isFinite(value) ? value : 0;
  }

  progressLabel(task: MockTask): string {
    return `${this.displayProgressValue(task)}％`;
  }

  displayProgressValue(task: MockTask): number {
    return this.draftProgress?.taskId === task.id ? this.draftProgress.value : this.progressValue(task);
  }
}
