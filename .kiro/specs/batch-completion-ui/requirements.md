# Requirements Document

## Meta

- **GitHub Issue**: （未作成）
- **スコープ**: 親タスク完了時の一括完了確認モーダルUI、Optimistic UI例外処理、一括完了成功/失敗時のUI更新

## Introduction

task-management-core（Requirement 6）で定義された一括完了の確認要求レスポンスに対応するUI仕様を定義する。task-detail-panelのRequirement 3（完了ボタン）およびRequirement 7（Optimistic UI）との衝突を解消し、親タスク完了時の確認フローをDetail_Panel側に追加定義する。

本specはtask-detail-panelのrequirements.mdを直接修正せず、追加仕様として振る舞いの上書き・拡張を定義する。

## Glossary

- **Batch_Completion_Modal**: 未完了子孫を持つ親タスクの完了操作時に表示される確認モーダル
- **Detail_Panel**: タスク詳細パネル（task-detail-panelで定義済み）
- **Detail_Save_Service**: Optimistic UI保存サービス（task-detail-panelで定義済み）
- **Task_Service**: タスクCRUDとビジネスロジックを担うサービス層（task-management-coreで定義済み）
- **Parent_Task**: 1つ以上の子タスクを持つタスク

## Requirements

### Requirement 1: 親タスク完了時のOptimistic UI例外

**User Story:** ユーザーとして、親タスクの完了操作時に未完了子孫がある場合は確認を求められたい。意図せず子孫が一括完了されるのを防ぐため。

#### Acceptance Criteria

1. 完了ボタンが押された対象がParent_Taskの場合、Detail_Save_ServiceはOptimistic UIによる即時反映を行わず、まずTask_Serviceへ完了リクエストを送信すること
2. Task_Serviceから確認要求レスポンス（未完了子孫リスト付き）が返却された場合、Detail_PanelはBatch_Completion_Modalを表示すること
3. Task_Serviceから確認要求なしの成功レスポンスが返却された場合（未完了子孫なし）、Detail_Save_Serviceはstatus=完了、progress=100をUIに反映すること
4. 完了ボタンが押された対象が子タスクを持たないタスクの場合、Detail_Save_Serviceは従来通りOptimistic UIで即時反映すること
5. Task_Serviceへのリクエスト中、Detail_Panelは完了ボタンをローディング状態（無効化＋スピナー表示）にすること

### Requirement 2: 一括完了確認モーダル

**User Story:** ユーザーとして、未完了の子孫タスク一覧を確認した上で一括完了を判断したい。影響範囲を把握してから操作するため。

#### Acceptance Criteria

1. Batch_Completion_Modalは「子孫タスクも一括で完了しますか？」というメッセージを表示すること
2. Batch_Completion_Modalは未完了子孫のタスク名とステータスをリスト形式で表示すること
3. 未完了子孫が10件を超える場合、Batch_Completion_Modalは先頭10件を表示し、残件数を「他N件」として表示すること
4. Batch_Completion_Modalは「一括完了」ボタンと「キャンセル」ボタンを表示すること
5. Batch_Completion_Modalはキーボードのescキーまたはモーダル外クリックでキャンセル操作と同等に閉じること

### Requirement 3: 一括完了の実行と結果反映

**User Story:** ユーザーとして、一括完了の実行結果がUIに正しく反映されてほしい。操作の成否を確認するため。

#### Acceptance Criteria

1. 「一括完了」ボタンが押された場合、Detail_Save_Serviceは確認済みフラグ付きの一括完了リクエストをTask_Serviceへ送信すること
2. 一括完了リクエスト中、Batch_Completion_Modalは「一括完了」ボタンをローディング状態にし、キャンセル操作を無効化すること
3. Task_Serviceから成功レスポンスが返却された場合、Detail_Panelは対象の親タスクのstatus=完了、progress=100をUIに反映し、Batch_Completion_Modalを閉じること
4. Task_Serviceからエラーレスポンスが返却された場合、Batch_Completion_Modalはエラーメッセージとリトライボタンを表示すること
5. リトライボタンが押された場合、Detail_Save_Serviceは同一の一括完了リクエストを再送信すること
6. 「キャンセル」ボタンが押された場合、Batch_Completion_ModalはUIを変更せず閉じ、タスクのステータスを未完了のまま維持すること

### Requirement 4: 既存仕様への修正指示

**User Story:** 開発者として、task-detail-panelの既存仕様との整合性を明確にしたい。実装時の矛盾を防ぐため。

#### Acceptance Criteria

1. task-detail-panel Requirement 3（ステータス完了操作）の受け入れ基準2について、本specのRequirement 1が優先適用されること（Parent_Taskの場合はOptimistic UIを適用せずサーバー問い合わせを先行する）
2. task-detail-panel Requirement 7（Optimistic UI保存）の受け入れ基準1について、Parent_Taskの完了操作は例外とし、本specのRequirement 1の手順に従うこと
3. task-detail-panel Requirement 7の受け入れ基準2のロールバック処理は、本specの対象操作（親タスク完了）には適用されないこと（本specではモーダル内でエラー表示とリトライを行うため）
