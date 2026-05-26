# Implementation Plan: display-and-filter

## Overview

バックエンドのFilterService（Python/FastAPI）とフロントエンドのTaskList関連コンポーネント（Angular）を段階的に実装する。フィルターロジック→API→フロントエンド表示→パネル遷移の順で構築し、各段階でテストを挟む。

## Tasks

- [ ] 1. FilterService コア実装
  - [ ] 1.1 Day_Boundary算出とeffective_at再帰算出を実装
    - `FilterService.get_day_boundary`と`compute_effective_at`を実装
    - _Requirements: 6.1, 6.2, 3.1, 3.2, 3.3, 3.4_
  - [ ]* 1.2 Property 1, 2, 5のプロパティテストを作成
    - **Property 1: effective_at再帰算出の正当性**
    - **Property 2: effective_at算出の非破壊性**
    - **Property 5: Day_Boundary日付計算**
    - hypothesisで各100回以上検証
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 6.1, 6.2**
  - [ ] 1.3 表示条件判定と先祖包含ロジックを実装
    - `evaluate_visibility`と`get_filtered_tree`を実装
    - sort_order昇順ソートを含む
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 1.6_
  - [ ]* 1.4 Property 3, 4, 6のプロパティテストを作成
    - **Property 3: フィルター条件の正当性**
    - **Property 4: 先祖包含の閉包性**
    - **Property 6: 兄弟タスクのソート順不変条件**
    - **Validates: Requirements 4.1, 4.2, 4.3, 5.1, 5.2, 5.3, 1.6**

- [ ] 2. フィルター付きAPIエンドポイント実装
  - [ ] 2.1 `GET /api/tasks?filtered=true&tz_offset=N` エンドポイントを作成
    - tz_offsetバリデーション（-720〜840）、FilterService呼び出し、TaskTreeNodeレスポンス返却
    - _Requirements: 4.4, 3.1_
  - [ ]* 2.2 APIエンドポイントのユニットテストを作成
    - 正常系（ツリー構造維持）、バリデーションエラー、空結果のケース
    - _Requirements: 4.4_

- [ ] 3. チェックポイント - バックエンド完了確認
  - 全テストがパスすることを確認し、不明点があればユーザーに質問する。

- [ ] 4. TaskListService とタスク一覧表示の実装
  - [ ] 4.1 TaskListServiceを実装
    - `tasks` signal、`loadTasks()`、API呼び出し、エラー時SnackBar通知とキャッシュ維持
    - _Requirements: 1.1, 4.4_
  - [ ] 4.2 TaskRowComponentを再帰ツリー描画で実装
    - タスク名、event_at、estimated_time、actual_time、progress表示
    - preview表示（存在時のみ小フォント、null/空文字時は非表示・余白なし）
    - Priority別背景色（none: デフォルト、priority: 黄色系、highest: 赤色系）
    - depth に応じたインデント、sort_order昇順表示
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_
  - [ ]* 4.3 TaskRowComponentのユニットテストを作成
    - Priority→CSS classマッピング、preview表示/非表示の条件分岐
    - _Requirements: 1.3, 1.4, 1.5_

- [ ] 5. 詳細パネル遷移の実装
  - [ ] 5.1 TaskListServiceにパネル状態管理を実装
    - `selectedTaskId`、`isPanelOpen` signal、`selectTask()`トグル動作、`closePanel()`
    - _Requirements: 2.1, 2.2, 2.3_
  - [ ] 5.2 詳細パネルUIを実装
    - 右からスライドイン/アウト、オーバーレイ表示（一覧幅不変）
    - 選択行ハイライト（左端アクセントバー＋背景色変更）
    - 閉じるボタン（X）とEscキー対応
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  - [ ]* 5.3 Property 7のプロパティテストを作成（fast-check）
    - **Property 7: パネルトグル状態の整合性**
    - クリックシーケンスに対するトグル動作の検証
    - **Validates: Requirements 2.2, 2.3**

- [ ] 6. 最終チェックポイント
  - 全テストがパスすることを確認し、不明点があればユーザーに質問する。

## Notes

- `*` 付きタスクはオプション（スキップ可能）
- 各タスクは対応するRequirementsを参照し追跡可能
- プロパティテストはバックエンド: hypothesis、フロントエンド: fast-check を使用

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["1.4", "2.1"] },
    { "id": 3, "tasks": ["2.2"] },
    { "id": 4, "tasks": ["4.1", "5.1"] },
    { "id": 5, "tasks": ["4.2", "5.2"] },
    { "id": 6, "tasks": ["4.3", "5.3"] }
  ]
}
```
