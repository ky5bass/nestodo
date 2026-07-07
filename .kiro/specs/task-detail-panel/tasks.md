# Implementation Plan:

## Overview

PR #36 で追加された Requirement 4.3（revert 時に `update_last_done: false` を送信し `tz_offset` を含めない）を実装し、テストで検証する。

## Task Dependency Graph

```json
{
  "waves": [
    ["Task 1"],
    ["Task 2"]
  ]
}
```

## Tasks

- [ ] 1. revert 時に `update_last_done: false` を送信する
  - **Requirements**: Requirement 4.3
  - **File**: `src/app/task-detail/task-detail-panel.component.ts`
  - **Details**:
    - `handleRevert` メソッドの `saveFields` 呼び出しに第3引数 `{ update_last_done: false }` を追加する
    - 現状: `this.save.saveFields(task.id, { status: 'incomplete', progress: result.progress });`
    - 修正後: `this.save.saveFields(task.id, { status: 'incomplete', progress: result.progress }, { update_last_done: false });`
    - `tz_offset` は含めない（revert は誤操作の訂正であり実績記録ではないため）
    - キャンセル時の動作に変更がないことを確認する

- [ ] 2. revert 時のリクエストボディをテストで検証する
  - **Requirements**: Requirement 4.3, Property 3
  - **Files**: `src/app/task-detail/detail-save.service.spec.ts`
  - **Details**:
    - `DetailSaveService` のテストに revert フロー検証を追加する
    - `saveFields` を `{ status: 'incomplete', progress: X }` + `{ update_last_done: false }` で呼んだとき、API リクエストボディが `{ status: 'incomplete', progress: X, update_last_done: false }` となること
    - リクエストボディに `tz_offset` キーが含まれないこと
    - fast-check プロパティテスト: 0〜99 のランダムな progress 値に対し、revert フロー後のリクエストボディが常に `update_last_done: false` かつ `tz_offset` を含まないことを検証する（numRuns: 100）
    - `ng test` が全テストパスすること

## Notes

- 既存の全コンポーネント（TaskDetailPanelComponent, TimeInputComponent, CalendarPickerComponent, TimePickerComponent, ProgressSliderComponent, StatusToggleComponent, TaskTypeRadioComponent, PrioritySegmentComponent, RevertModalComponent, BatchCompletionModalComponent）および DetailSaveService は実装済み
- 今回の変更は PR #36 で追加された revert 時の `update_last_done` 仕様のみが対象
