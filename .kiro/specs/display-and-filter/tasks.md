# Implementation Plan: display-and-filter

## Overview

タスクリストのツリー表示、詳細パネル遷移、グローバルフィルター（effective_at算出・表示条件・先祖包含）、日付境界、および詳細パネルからの一覧即時反映を実装する。バックエンド（Python: FilterService）→ フロントエンド（Angular: TaskListService・コンポーネント群）の順で段階的に構築する。

## Tasks

- [ ] 1. バックエンド FilterService の実装
  - [ ] 1.1 FilterService の effective_at 算出ロジックを実装する
    - `FilterService.compute_effective_at` メソッドを作成
    - タスクツリーを再帰的に走査し、自身の `event_at` が null の場合は祖先から継承する
    - 全祖先が null の場合は null を返す
    - 元の `event_at` フィールドを変更しないこと
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ]* 1.2 Property 1, 2 のプロパティテストを作成する
    - **Property 1: effective_at再帰算出の正当性**
    - **Property 2: effective_at算出の非破壊性**
    - hypothesis を使用し各100回以上検証
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4**

  - [ ] 1.3 FilterService の Day_Boundary 日付計算を実装する
    - `FilterService.get_day_boundary` メソッドを作成
    - ローカル時刻午前5時を境界として論理日付を算出する
    - `tz_offset` パラメータでクライアントのタイムゾーンを受け取る
    - _Requirements: 6.1, 6.2_

  - [ ]* 1.4 Property 5 のプロパティテストを作成する
    - **Property 5: Day_Boundary日付計算**
    - hypothesis を使用し100回以上検証
    - **Validates: Requirements 6.1, 6.2**

  - [ ] 1.5 FilterService の表示条件判定ロジックを実装する
    - `FilterService.evaluate_visibility` メソッドを作成
    - 未完了かつ effective_at <= 本日+1ヶ月 → 表示
    - 完了かつ last_done_at = 本日(Day_Boundary基準) → 表示
    - effective_at が null かつ未完了 → 除外
    - _Requirements: 4.1, 4.2, 4.3_

  - [ ]* 1.6 Property 3 のプロパティテストを作成する
    - **Property 3: フィルター条件の正当性**
    - hypothesis を使用し100回以上検証
    - **Validates: Requirements 4.1, 4.2, 4.3**

  - [ ] 1.7 FilterService の先祖包含ロジックとツリー構築を実装する
    - `FilterService.get_filtered_tree` メソッドを作成
    - 表示条件を満たすタスクのルートまでの全祖先を含める
    - 自身も子孫も条件を満たさないタスクは除外する
    - フィルター後も兄弟タスクの sort_order 昇順を維持する
    - _Requirements: 5.1, 5.2, 5.3, 1.6_

  - [ ]* 1.8 Property 4, 6 のプロパティテストを作成する
    - **Property 4: 先祖包含の閉包性**
    - **Property 6: 兄弟タスクのソート順不変条件**
    - hypothesis を使用し各100回以上検証
    - **Validates: Requirements 5.1, 5.2, 5.3, 1.6**

- [ ] 2. バックエンド API エンドポイントの実装
  - [ ] 2.1 フィルター付きタスク取得 API エンドポイントを実装する
    - `GET /api/tasks?filtered=true&tz_offset=-540` エンドポイントを作成
    - `tz_offset` のバリデーション（-720〜840 範囲チェック）
    - FilterService を呼び出しフィルター済みツリーを返却する
    - レスポンスは `TaskTreeNode` 形式のネスト構造
    - エラーハンドリング: invalid_tz_offset → 400、tree_fetch_error → 500
    - _Requirements: 4.4, 1.1_

  - [ ]* 2.2 API エンドポイントのユニットテストを作成する
    - 正常系: フィルター済みツリー構造の返却確認
    - 異常系: tz_offset 範囲外、DB接続失敗
    - フィルター結果0件時の空配列レスポンス確認
    - _Requirements: 4.4_

- [ ] 3. チェックポイント - バックエンド実装確認
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. フロントエンド TaskListService の実装
  - [ ] 4.1 TaskListService の基本構造と API 呼び出しを実装する
    - `TaskListService` を作成し `tasks`, `selectedTaskId`, `isPanelOpen` の Signal を定義
    - `loadTasks()` メソッドで `GET /api/tasks?filtered=true&tz_offset=...` を呼び出す
    - `tz_offset` は `new Date().getTimezoneOffset()` で取得
    - API失敗時は SnackBar で通知し前回キャッシュデータを表示維持
    - _Requirements: 4.4, 1.1_

  - [ ] 4.2 TaskListService のパネル状態管理を実装する
    - `selectTask(taskId)` メソッドを実装（トグル動作含む）
    - 同一タスク再クリック → パネル閉じ、別タスク → 対象切り替え
    - `closePanel()` メソッドを実装
    - _Requirements: 2.1, 2.2, 2.3, 2.5_

  - [ ]* 4.3 Property 7 のプロパティテストを作成する
    - **Property 7: パネルトグル状態の整合性**
    - fast-check を使用し100回以上検証
    - **Validates: Requirements 2.2, 2.3**

  - [ ] 4.4 TaskListService の一覧即時反映ロジックを実装する
    - `updateTaskLocally(taskId, field, value)` メソッドを実装
    - `rollbackTaskLocally(taskId, field, previousValue)` メソッドを実装
    - 詳細パネルの保存成功時に tasks Signal をローカル更新
    - サーバーエラー時は変更前の値にロールバック
    - _Requirements: 7.1, 7.2, 7.3_

  - [ ]* 4.5 Property 8 のプロパティテストを作成する
    - **Property 8: 一覧即時反映の整合性**
    - fast-check を使用し100回以上検証
    - **Validates: Requirements 7.1, 7.2, 7.3**

- [ ] 5. フロントエンド コンポーネントの実装
  - [ ] 5.1 TaskRowComponent を実装する
    - 再帰的ツリー描画コンポーネントを作成
    - `node: TaskTreeNode` と `depth: number` を Input として受け取る
    - インデント表示（depth に応じたマージン）
    - タスク名、期限、予定時間、実績時間、進捗をテキスト表示
    - preview 表示: 存在する場合は小さいフォントで表示、null/空文字の場合は非表示・余白なし
    - Priority に応じた背景色変更（none: デフォルト、priority: 黄色系、highest: 赤色系）
    - 兄弟タスクを sort_order 昇順で描画
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [ ] 5.2 TaskListComponent を実装する
    - TaskListService から tasks Signal を購読しツリーを描画
    - TaskRowComponent を再帰的に使用
    - タスクのクリックイベントで `selectTask(taskId)` を呼び出す
    - 選択中タスクのハイライト表示（左端アクセントバー＋背景色変更）
    - _Requirements: 1.1, 2.1, 2.4_

  - [ ] 5.3 詳細パネルの開閉アニメーションとイベント処理を実装する
    - 右からスライドイン/アウトのアニメーション
    - パネルはオーバーレイ表示し一覧の幅は変更しない
    - X ボタンクリックで `closePanel()` 呼び出し
    - Esc キーで `closePanel()` 呼び出し
    - _Requirements: 2.1, 2.3, 2.5_

  - [ ]* 5.4 コンポーネントのユニットテストを作成する
    - Priority → CSS class マッピングのテスト
    - preview 表示/非表示の条件分岐テスト
    - Esc キー/X ボタンによるパネル閉じのテスト
    - Angular TestBed を使用
    - _Requirements: 1.3, 1.4, 1.5, 2.5_

- [ ] 6. 統合とワイヤリング
  - [ ] 6.1 詳細パネルと TaskListService の連携を接続する
    - 詳細パネルの保存成功コールバックから `updateTaskLocally` を呼び出す
    - サーバーエラー時のコールバックから `rollbackTaskLocally` を呼び出す
    - API 再取得を行わずフロントエンドで完結することを確認
    - _Requirements: 7.1, 7.2, 7.3_

  - [ ]* 6.2 結合テストを作成する
    - フィルター付きAPI呼び出しの正常系（ツリー構造維持確認）
    - タイムゾーン境界値テスト
    - _Requirements: 4.4, 6.1, 6.2_

- [ ] 7. 最終チェックポイント - 全テスト通過確認
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- `*` が付いたタスクはオプションであり、MVP達成のためにスキップ可能
- 各タスクは具体的な要件番号を参照し、トレーサビリティを確保している
- チェックポイントにより段階的な検証を行う
- プロパティテスト: バックエンド(hypothesis)、フロントエンド(fast-check)
- ユニットテスト: バックエンド(pytest)、フロントエンド(Angular TestBed)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.3"] },
    { "id": 1, "tasks": ["1.2", "1.4", "1.5"] },
    { "id": 2, "tasks": ["1.6", "1.7"] },
    { "id": 3, "tasks": ["1.8", "2.1"] },
    { "id": 4, "tasks": ["2.2", "4.1"] },
    { "id": 5, "tasks": ["4.2", "4.4"] },
    { "id": 6, "tasks": ["4.3", "4.5", "5.1"] },
    { "id": 7, "tasks": ["5.2", "5.3"] },
    { "id": 8, "tasks": ["5.4", "6.1"] },
    { "id": 9, "tasks": ["6.2"] }
  ]
}
```
