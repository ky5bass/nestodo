# Implementation Plan: batch-completion-ui

## Overview

親タスク完了時の一括完了確認モーダルUI実装。DetailSaveServiceのCompletion_Triggerルーティング追加、BatchCompletionModalComponentの新規作成、キャンセル時ロールバック、エラーハンドリングを段階的に実装する。

## Tasks

- [ ] 1. DetailSaveServiceのCompletion_Triggerルーティング実装
  - [ ] 1.1 `isCompletionTrigger`判定メソッドと`startCompletionFlow`メソッドを追加
    - `saveField`内でstatus=完了またはprogress=100を検出し、Optimistic UIをスキップしてサーバーへtz_offset付きリクエストを送信するロジックを実装
    - レスポンスtype='completed'の場合はUI反映、type='confirmation_required'の場合はモーダル表示への分岐を実装
    - _Requirements: 1.1, 1.3, 2.1, 2.4_
  - [ ] 1.2 ローディング状態管理の実装
    - 完了リクエスト中に完了ボタンを無効化＋スピナー表示、progressフィールドを読み取り専用にする
    - _Requirements: 1.4_
  - [ ]* 1.3 Property 1のプロパティテスト作成
    - **Property 1: Completion_Triggerルーティング（サーバー一元判定）**
    - fast-checkでランダムなタスク×トリガー種別を生成し、常にtz_offset付きでサーバーへリクエストが送信されること、レスポンスtype別のUI分岐を検証
    - **Validates: Requirements 1.1, 1.2, 1.3, 2.1, 2.4**

- [ ] 2. BatchCompletionModalComponent実装
  - [ ] 2.1 モーダルコンポーネントの新規作成
    - MatDialogベースのスタンドアロンコンポーネントを作成
    - `BatchCompletionModalData`インターフェースと`BatchCompletionModalResult`型を定義
    - 確認メッセージ「子孫タスクも一括で完了しますか？」、未完了子孫リスト、「一括完了」「キャンセル」ボタンを実装
    - _Requirements: 3.1, 3.4, 3.5_
  - [ ] 2.2 未完了子孫リストの表示とトランケーション実装
    - DISPLAY_LIMIT=10件までのタスク名・ステータス表示、超過時は「他N件」表示を実装
    - _Requirements: 3.2, 3.3_
  - [ ]* 2.3 Property 3のプロパティテスト作成
    - **Property 3: 未完了子孫リストの表示とトランケーション**
    - fast-checkでランダムな長さ(1〜50)のPendingChildリストを生成し、表示件数と残件数の正確性を検証
    - **Validates: Requirements 3.2, 3.3**

- [ ] 3. チェックポイント - 基本フロー確認
  - すべてのテストがパスすることを確認し、不明点があればユーザーに質問する。

- [ ] 4. 一括完了実行とキャンセル処理
  - [ ] 4.1 一括完了確認リクエストの送信処理
    - モーダルで「一括完了」押下時にconfirmed=true＋tz_offset付きリクエストを送信
    - リクエスト中のローディング状態（ボタン無効化、キャンセル無効化）を実装
    - _Requirements: 4.1, 4.2_
  - [ ] 4.2 成功時のUI反映とツリー再取得
    - 親タスク＋全子孫のstatus=完了、progress=100をUI反映し、モーダルを閉じる
    - サブツリー全体のタスクリストをrefetchしてツリー一覧を同期
    - _Requirements: 4.3, 4.4_
  - [ ] 4.3 キャンセル時のロールバック実装
    - モーダルキャンセル（ボタン/esc/backdrop）時にprogressを元の値に復元し、statusを未完了のまま維持
    - _Requirements: 2.2, 4.7_
  - [ ]* 4.4 Property 2のプロパティテスト作成
    - **Property 2: キャンセル時のロールバック**
    - fast-checkでランダムなprogress値(0〜99)を生成し、キャンセル後の復元を検証
    - **Validates: Requirements 2.2, 4.7**

- [ ] 5. エラーハンドリングとリトライ
  - [ ] 5.1 エラー表示とリトライ機能の実装
    - 一括完了リクエスト失敗時にモーダル内でエラーメッセージ＋リトライボタンを表示
    - 初回完了リクエスト失敗時はSnackBarでエラー通知しUIは変更なし
    - _Requirements: 4.5, 4.6_
  - [ ]* 5.2 エラーハンドリングのユニットテスト作成
    - API失敗時のSnackBar通知、モーダル内エラー表示、リトライ動作を検証
    - _Requirements: 4.5, 4.6_

- [ ] 6. 最終チェックポイント - 全テストパス確認
  - すべてのテストがパスすることを確認し、不明点があればユーザーに質問する。

## Notes

- `*`付きタスクはオプションであり、MVP優先時はスキップ可能
- 各タスクは具体的なRequirementsを参照し、トレーサビリティを確保
- チェックポイントで段階的に品質を検証
- プロパティテストはfast-checkを使用し、設計ドキュメントのCorrectness Propertiesを検証
- ユニットテストはAngular TestBedを使用

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1"] },
    { "id": 1, "tasks": ["1.2", "2.2"] },
    { "id": 2, "tasks": ["1.3", "2.3"] },
    { "id": 3, "tasks": ["4.1", "4.3"] },
    { "id": 4, "tasks": ["4.2", "4.4"] },
    { "id": 5, "tasks": ["5.1"] },
    { "id": 6, "tasks": ["5.2"] }
  ]
}
```
