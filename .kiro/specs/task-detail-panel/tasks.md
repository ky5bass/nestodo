# Implementation Plan: task-detail-panel

## Overview

タスク詳細パネルの属性表示・インライン編集・Optimistic UI保存を段階的に実装する。まずサービス層とユーティリティ関数を構築し、次に個別UIコンポーネントを実装、最後に統合してDetailPanelを完成させる。

## Tasks

- [ ] 1. DetailSaveServiceとユーティリティ関数の実装
  - [ ] 1.1 DetailSaveServiceの作成
    - `src/app/services/detail-save.service.ts` を作成
    - Optimistic UI（即時UI反映）、デバウンス(300ms)、ロールバック、リトライのロジックを実装
    - `saveField(taskId, field, value, options?)` と `saveContent(taskId, field, value)` と `retry(taskId, field)` を実装
    - Completion_Trigger（status=完了 or progress=100）時はOptimistic UIを適用せずbatch-completion-uiのフローに委譲する分岐を実装
    - update_last_done=true時にtz_offsetを付与するロジックを実装
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 8.3, 8.4, 8.7_

  - [ ]* 1.2 Property 3のプロパティテスト作成
    - **Property 3: Optimistic UIの整合性**
    - Completion_Triggerを除くランダムなフィールド×値の組み合わせで成功/失敗時のUI状態を検証
    - fast-checkを使用
    - **Validates: Requirements 7.1, 7.2**

  - [ ]* 1.3 Property 4のプロパティテスト作成
    - **Property 4: デバウンスは最新値のみ送信**
    - ランダムな編集シーケンス生成後、送信値が最終値のみであることを検証
    - fast-checkを使用
    - **Validates: Requirements 7.4**

  - [ ] 1.4 TimeInputComponentのsnapToNearest関数の実装
    - `src/app/components/time-input/time-input.utils.ts` にsnapToNearest純粋関数を実装
    - 離散値配列内で入力値に最も近い値を返す。等距離の場合は小さい方を返す
    - _Requirements: 5.6_

  - [ ]* 1.5 Property 2のプロパティテスト作成
    - **Property 2: Time_Inputの最近傍スナップ**
    - ランダムな正整数に対するsnapToNearestの戻り値を検証
    - fast-checkを使用
    - **Validates: Requirements 5.6**

- [ ] 2. チェックポイント - コアサービスの検証
  - すべてのテストが通ることを確認し、不明点があればユーザーに質問する。

- [ ] 3. 個別UIコンポーネントの実装
  - [ ] 3.1 TaskTypeRadioComponentの作成
    - `src/app/components/task-type-radio/` 配下にコンポーネントを作成
    - TODO/予定の2択ラジオボタンUI、選択変更時に即saveField発火
    - _Requirements: 9.1, 9.2, 9.3_

  - [ ] 3.2 CalendarPickerComponentとTimePickerComponentの作成
    - `src/app/components/calendar-picker/` 配下にCalendarPickerComponentを作成
    - 「今日」「明日」「1週間後」のショートカットボタンを配置
    - ショートカット押下で該当日付をセットしピッカーを閉じる
    - `src/app/components/time-picker/` 配下にTimePickerComponentを作成
    - 5分刻み(0-55)、時間(0-23)の端止まり（ループしない）仕様を実装
    - デフォルト時刻は00:00
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

  - [ ]* 3.3 Property 5のプロパティテスト作成
    - **Property 5: Time_Pickerの端止まり不変条件**
    - ランダムな操作シーケンス（増減連打）でTime_Pickerの時間(0-23)・分(0-55)が範囲外にならないことを検証
    - fast-checkを使用
    - **Validates: Requirements 10.5**

  - [ ]* 3.4 Property 6のプロパティテスト作成
    - **Property 6: ショートカットボタンの日付設定**
    - ランダムな基準日に対し、各ショートカットボタンが正しいオフセット日を設定することを検証
    - fast-checkを使用
    - **Validates: Requirements 10.2, 10.3**

  - [ ] 3.5 StatusToggleComponentの作成
    - `src/app/components/status-toggle/` 配下にコンポーネントを作成
    - 未完了/完了のトグルスイッチUI
    - 未完了→完了時: status=完了, progress=100に同時更新
    - 完了→未完了時: RevertModalを表示
    - _Requirements: 11.1, 11.2, 11.3, 3.1, 3.2_

  - [ ] 3.6 PrioritySegmentComponentの作成
    - `src/app/components/priority-segment/` 配下にコンポーネントを作成
    - none/priority/highestの3ボタン横並びセグメントコントロール
    - 選択中ボタンのハイライト表示、タップ時に即保存
    - _Requirements: 12.1, 12.2, 12.3_

  - [ ] 3.7 ProgressSliderComponentの作成
    - `src/app/components/progress-slider/` 配下にコンポーネントを作成
    - 0〜100の連続値スライダー、横にパーセント数値表示
    - progress=100到達時のCompletion_Trigger動作を維持
    - _Requirements: 13.1, 13.2, 13.3, 13.4_

  - [ ]* 3.8 Property 1のプロパティテスト作成
    - **Property 1: Progress=100とStatus完了の不変条件**
    - ランダムなprogress値(0-100)設定後のstatus状態を検証
    - fast-checkを使用
    - **Validates: Requirements 3.1, 3.2, 11.2**

  - [ ] 3.9 TimeInputComponentの作成
    - `src/app/components/time-input/` 配下にコンポーネントを作成
    - 分・時間・日の各単位ごとにスライダーとテキストボックスを表示
    - スライダー値変更時にテキストボックスを同期、テキスト入力時にsnapToNearestでスライダーを同期
    - バリデーション（0以下・非整数のエラー表示）
    - estimated_timeとactual_timeの両方に使用
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_

  - [ ] 3.10 RevertModalComponentの作成
    - `src/app/components/revert-modal/` 配下にコンポーネントを作成
    - MatDialogで実装、警告メッセージと進捗入力フィールド(0〜99)を表示
    - 確定時にRevertResult（confirmed: true, progress値）を返す
    - キャンセル時にconfirmed: falseを返す
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 4. チェックポイント - 個別コンポーネントの検証
  - すべてのテストが通ることを確認し、不明点があればユーザーに質問する。

- [ ] 5. TaskDetailPanelComponentの統合
  - [ ] 5.1 TaskDetailPanelComponentの作成
    - `src/app/components/task-detail-panel/` 配下にコンポーネントを作成
    - 全属性の表示（task_name, task_type, event_at, status, progress, priority, estimated_time, actual_time, export_flag, last_done_at）
    - task_contentsテーブルからpre_info, notes, reflectionを取得・表示
    - nullの場合は空の編集可能エリアを表示
    - task_typeに応じたevent_atラベル切り替え（TODO→「期限」、SCHEDULE→「開始日時」）
    - 一括編集モード中のtask_name読み取り専用制御
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [ ] 5.2 エクスポートフラグUIの実装
    - export_flagの目アイコン表示（true=開いた目、false=閉じた目）
    - クリック時にtrue/false切り替えてDetailSaveService経由で保存
    - _Requirements: 6.1, 6.2_

  - [ ] 5.3 Update_Last_Done_Checkboxの実装
    - progressまたはactual_time編集時に「本日の実績として更新する」チェックボックスを表示
    - デフォルトtrue、条件に応じてupdate_last_done/tz_offsetをリクエストに含める
    - progress/actual_time以外のフィールド編集時は非表示
    - last_done_atは読み取り専用表示
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [ ] 5.4 各コンポーネントの統合配線
    - TaskTypeRadio, CalendarPicker, TimePicker, StatusToggle, PrioritySegment, ProgressSlider, TimeInput, RevertModalをTaskDetailPanelComponentに組み込み
    - 各コンポーネントのvalueChange/toggle出力をDetailSaveServiceに接続
    - _Requirements: 2.2, 9.2, 10.7, 12.3, 13.2_

  - [ ]* 5.5 統合テストの作成
    - TaskDetailPanelComponent全体のテスト
    - APIモックを用いたDetailSaveServiceのE2Eフロー検証
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ] 6. 最終チェックポイント
  - すべてのテストが通ることを確認し、不明点があればユーザーに質問する。

## Notes

- `*` マーク付きタスクはオプションであり、MVPのためにスキップ可能
- 各タスクは具体的なRequirementsを参照しトレーサビリティを確保
- チェックポイントで段階的な品質確認を実施
- プロパティテストはfast-checkライブラリを使用して正しさの性質を検証
- 単体テストは具体例とエッジケースの検証に使用

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.4"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.5", "3.1", "3.6"] },
    { "id": 2, "tasks": ["3.2", "3.5", "3.7", "3.9", "3.10"] },
    { "id": 3, "tasks": ["3.3", "3.4", "3.8"] },
    { "id": 4, "tasks": ["5.1", "5.2", "5.3"] },
    { "id": 5, "tasks": ["5.4"] },
    { "id": 6, "tasks": ["5.5"] }
  ]
}
```
