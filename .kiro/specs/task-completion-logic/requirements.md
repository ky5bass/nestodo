# Requirements Document

## Meta

- **バージョン**: v1.0
- **スコープ**: ステータス連動ロジック、一括完了ロジック（サーバー側一元判定）

## Introduction

nestodoのタスク完了に関するビジネスロジックを定義する。進捗とステータスの双方向自動連動、および親タスク完了時の子孫一括完了処理（サーバー側DB状態による一元判定）を対象とする。タスクのCRUD基本操作はtask-crud specに、最終実施日管理はtask-last-done specに分離している。

## Glossary

- **Task_Service**: タスクのCRUD操作とビジネスロジックを担うサービス層
- **Completion_Trigger**: progress=100またはstatus='complete'への更新により完了遷移が発生するイベント
- **confirmation_required**: 未完了子孫が存在する場合にTask_Serviceが返却する確認要求レスポンス

## Requirements

### Requirement 1: ステータス連動ロジック

**User Story:** 開発者として、進捗とステータスが自動連動してほしい。手動の二重管理を避けるため。

#### Acceptance Criteria

1. 進捗が100に更新された場合（null含む以前の値に関わらず）、Task_Serviceは自動的にステータスを「完了」に設定すること
2. ステータスを「完了」から「未完了」に戻す場合、Task_Serviceは同一操作内で進捗を100未満に設定することを必須とすること
3. 進捗100未満の値なしにステータス戻しがリクエストされた場合、Task_Serviceは部分更新を適用せずバリデーションエラーを返却すること

### Requirement 2: 一括完了ロジック（サーバー側一元判定）

**User Story:** 開発者として、親タスク完了時に子孫も一括完了したい。操作の手間を減らすため。

#### Acceptance Criteria

1. status=completeまたはprogress=100によりタスクが完了状態へ遷移する全リクエスト（PUT /api/tasks/{id}、TaskService.complete(id, confirmed, tz_offset)を含む全経路）において、Task_Serviceは未完了子孫の有無をサーバー側DB状態から判定すること。フロントエンドのツリー表示状態やフィルター状態には依存しないこと
2. 未完了の子孫を持つタスクを完了にする場合、Task_Serviceは未完了子孫のタスクID、タスク名、およびステータスを含む確認要求レスポンス（type='confirmation_required'）を返却すること
3. 未完了の子孫がないタスクを完了にする場合、Task_Serviceは確認なしで完了処理を実行し、成功レスポンス（type='completed'）を返却すること
4. 未完了子孫がある場合、confirmed=trueの完了リクエストのみが、親と全子孫のステータスを「完了」、進捗を100に深さ優先順で設定できること。confirmed=falseまたは未指定の場合は一括更新を実行しないこと
5. 一括完了中にいずれかの子孫の更新が失敗した場合、Task_Serviceは全変更をロールバックしエラーを返却すること
