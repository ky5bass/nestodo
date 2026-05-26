# Implementation Plan: タスク詳細パネル

## Overview

Angular スタンドアロンコンポーネント構成で、TaskDetailPanelComponent、TimeInputComponent、RevertModalComponent、DetailSaveServiceを段階的に実装する。

## Tasks

- [ ] 1. 保存サービスとコアロジック
  - [ ] 1.1 DetailSaveService の実装
    - Optimistic UI: 保存前にUI即時反映、エラー時ロールバック
    - デバウンス(300ms): 同一フィールドへの連続編集は最新値のみ送信
    - saveField / saveContent / retry メソッド実装
    - update_last_done, tz_offset オプション対応
    - リトライ付きSnackBarエラー通知
    - _要件: 7.1, 7.2, 7.3, 7.4, 2.2, 2.5_
  - [ ]* 1.2 プロパティテスト: Optimistic UIの整合性
    - **Property 3: Optimistic UIの整合性**
    - **検証対象: 要件 7.1, 7.2**
  - [ ]* 1.3 プロパティテスト: デバウンスは最新値のみ送信
    - **Property 4: デバウンスは最新値のみ送信**
    - **検証対象: 要件 7.4**

- [ ] 2. TimeInputComponent の実装
  - [ ] 2.1 TimeInputComponent の作成
    - 分(5,10,15,20,30,45)・時間(1,2,3,4,6)・日(1,2,3,4,5,7,10,15,20)の離散値スライダー
    - スライダー⇔テキストボックスの双方向同期
    - snapToNearest 純粋関数の実装
    - バリデーション（0以下・非整数はエラー表示）
    - _要件: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_
  - [ ]* 2.2 プロパティテスト: snapToNearest の最近傍スナップ
    - **Property 2: Time_Inputの最近傍スナップ**
    - **検証対象: 要件 5.6**

- [ ] 3. チェックポイント
  - 全テストがパスすることを確認し、不明点があればユーザーに質問する。

- [ ] 4. RevertModalComponent の実装
  - [ ] 4.1 RevertModalComponent の作成
    - MatDialog ベースのモーダル実装
    - 警告メッセージ表示、進捗入力フィールド（0〜99範囲バリデーション）
    - 確定時に RevertResult { confirmed: true, progress } を返却
    - キャンセル時に { confirmed: false } を返却
    - _要件: 4.1, 4.2, 4.3, 4.4_
  - [ ]* 4.2 RevertModalComponent のユニットテスト
    - 範囲外入力のバリデーション、確定/キャンセル動作テスト
    - _要件: 4.2, 4.3, 4.4_

- [ ] 5. TaskDetailPanelComponent の実装
  - [ ] 5.1 属性表示レイアウトの実装
    - task_name, task_type, event_at, status, progress, priority, estimated_time, actual_time, export_flag, last_done_at の表示
    - task_contentsテーブルから pre_info, notes, reflection の取得・表示
    - null時の空編集エリア表示、task_typeに応じたevent_atラベル切替
    - _要件: 1.1, 1.2, 1.3, 1.4_
  - [ ] 5.2 インライン編集機能の実装
    - 各フィールド編集時にDetailSaveServiceへ個別保存リクエスト送信
    - 一括編集モード中のtask_name読み取り専用制御
    - last_done_at読み取り専用表示
    - task_type変更時のevent_atラベル即時切替
    - progressバリデーション（0〜100範囲外エラー）
    - _要件: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_
  - [ ] 5.3 ステータス完了操作の実装
    - 未完了タスクへの完了ボタン表示、完了タスクでは非表示/無効化
    - 完了ボタン押下時: status=完了, progress=100 同時更新 + tz_offset付与
    - progress=100手動入力時のstatus自動完了
    - _要件: 3.1, 3.2, 3.3, 3.4_
  - [ ]* 5.4 プロパティテスト: Progress=100とStatus完了の不変条件
    - **Property 1: Progress=100とStatus完了の不変条件**
    - **検証対象: 要件 3.3**

- [ ] 6. エクスポートフラグと最終実施日更新制御
  - [ ] 6.1 エクスポートフラグUIの実装
    - export_flag状態に応じた目アイコン表示（true=開/false=閉）
    - クリックでtrue/false切替、DetailSaveServiceへ保存
    - _要件: 6.1, 6.2_
  - [ ] 6.2 Update_Last_Done_Checkbox の実装
    - progress/actual_time編集時にチェックボックス表示（デフォルトtrue）
    - true時: update_last_done=true + tz_offset を保存リクエストに含める
    - false時: update_last_done=false のみ（tz_offset不要）
    - progress/actual_time以外の編集時は非表示
    - _要件: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

- [ ] 7. ステータス戻し統合とワイヤリング
  - [ ] 7.1 ステータス戻しフローの統合
    - 完了→未完了変更要求時にRevertModal表示
    - 確定時: status=未完了, progress=入力値で更新
    - キャンセル時: status=完了を維持
    - _要件: 4.1, 4.2, 4.3, 4.4_
  - [ ]* 7.2 統合テスト
    - DetailSaveServiceのOptimistic UI→API→ロールバックフロー
    - 完了/戻しフローのE2E動作検証
    - _要件: 7.1, 7.2, 3.2, 4.3_

- [ ] 8. 最終チェックポイント
  - 全テストがパスすることを確認し、不明点があればユーザーに質問する。

## Notes

- `*` 付きタスクはオプションでありスキップ可能
- 各タスクは対応する要件番号を参照し追跡可能性を確保
- プロパティテストはfast-checkライブラリを使用
- Angular TestBedを使用した単体テスト
- Completion_Trigger時はbatch-completion-uiのフローに委譲（本specでは実装対象外）

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "2.2"] },
    { "id": 2, "tasks": ["4.1"] },
    { "id": 3, "tasks": ["4.2", "5.1"] },
    { "id": 4, "tasks": ["5.2", "6.1", "6.2"] },
    { "id": 5, "tasks": ["5.3"] },
    { "id": 6, "tasks": ["5.4", "7.1"] },
    { "id": 7, "tasks": ["7.2"] }
  ]
}
```
