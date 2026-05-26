# Implementation Plan: batch-edit-mode

## Overview

フロントエンドはSortOrderCalculator（純粋関数）→EditModeService（状態管理）→UI Components（ツールバー・タスク行）の順で構築し、バックエンドはバッチ保存APIを最後に実装する。各段階でプロパティテスト・ユニットテストを挟む。

## Tasks

- [ ] 1. SortOrderCalculator実装
  - [ ] 1.1 `SortOrderCalculator` staticクラスを実装
    - `midpoint`, `appendToEnd`, `prependToHead`, `needsRebalance`, `rebalance`を実装
    - リバランスは1.0始まりの等間隔値を割り当て
    - _Requirements: 3.2, 3.3, 5.2, 5.3, 5.4, 5.5_
  - [ ]* 1.2 Property 1, 2, 3のプロパティテストを作成
    - **Property 1: sort_order中間値算出** — prev < midpoint < next
    - **Property 2: sort_order境界値算出** — prepend < first, append > last
    - **Property 3: リバランスの順序保存と等間隔性**
    - fast-checkで各100回以上検証
    - **Validates: Requirements 3.2, 3.3, 5.2, 5.3, 5.4, 5.5**

- [ ] 2. EditModeService コア実装
  - [ ] 2.1 EditModeServiceの状態管理とChangeBufferを実装
    - Signal-based状態（isEditMode, changeBuffer, hasChanges, filterDisabled）
    - `enterEditMode`, `exitEditMode`, `applyOperation`メソッド
    - Operation型定義（rename, create, delete, move）
    - タスク名バリデーション（空文字・255文字超の拒否）
    - カスケード削除時の全子孫ID収集ロジック
    - _Requirements: 1.1, 1.3, 2.1, 2.2, 2.3, 3.1, 4.1, 4.2, 5.6_
  - [ ]* 2.2 Property 4, 5, 6, 7のプロパティテストを作成
    - **Property 4: Change_Buffer操作記録完全性**
    - **Property 5: タスク名バリデーション**
    - **Property 6: カスケード削除の完全性**
    - **Property 7: 階層制限の強制**
    - **Validates: Requirements 2.2, 2.3, 3.1, 4.1, 4.2, 5.1, 5.6**
  - [ ] 2.3 Undo/Redo（HistoryStack）を実装
    - undoStack, redoStackのSignal管理
    - `undo`, `redo`メソッド、スタッククリア処理
    - 子孫削除の単一ステップ復元
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_
  - [ ]* 2.4 Property 8のプロパティテストを作成
    - **Property 8: Undo/Redoラウンドトリップ**
    - 任意の操作列に対し全undo後バッファ空、全redo後バッファ等価
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.7**
  - [ ] 2.5 フィルター解除ロジックを実装
    - `filterDisabled` Signal切替、切替時のバッファ保持確認
    - モード終了時のリセット処理
    - _Requirements: 8.1, 8.2, 8.4, 8.5_
  - [ ]* 2.6 Property 9のプロパティテストを作成
    - **Property 9: フィルター切替時のバッファ保持**
    - **Validates: Requirements 8.4**

- [ ] 3. チェックポイント - コアロジック完了確認
  - 全テストがパスすることを確認し、不明点があればユーザーに質問する。

- [ ] 4. UIコンポーネント実装
  - [ ] 4.1 EditModeToolbarComponentを実装
    - 保存/キャンセル/Undo/Redo/フィルター解除チェックボックスのUI
    - 確認ダイアログ（未保存変更時のキャンセル・モード切替）
    - Undo/Redoボタンの有効/無効制御
    - _Requirements: 1.1, 1.2, 1.3, 6.1, 6.2, 6.3, 6.5, 7.5, 7.6, 8.1_
  - [ ] 4.2 TaskRowComponent（インライン編集・削除）を実装
    - タスク名テキストフィールド、削除ボタン、余白クリックで詳細パネル
    - 削除されたタスクの即時非表示
    - _Requirements: 1.4, 1.5, 2.1, 4.3_
  - [ ] 4.3 TaskRowComponent（ドラッグ&ドロップ）を実装
    - ドラッグハンドル表示、同一親・異なる親への移動
    - 階層10超のドロップ禁止、ルート移動時event_atダイアログ
    - sort_order算出とリバランスのChange_Buffer連携
    - _Requirements: 5.1, 5.2, 5.4, 5.5, 5.6, 5.7, 5.8_
  - [ ]* 4.4 UIコンポーネントのユニットテストを作成
    - モード遷移、確認ダイアログ、D&D操作のテスト
    - Angular TestBed使用
    - _Requirements: 1.1, 1.2, 5.1, 6.2_

- [ ] 5. バックエンド バッチ保存API実装
  - [ ] 5.1 `PATCH /api/tasks/batch`エンドポイントを実装
    - BatchOperation Pydanticモデル定義
    - 単一トランザクションで全操作適用
    - 最終状態でRoot_Task event_at不変条件・10階層制限を検証、違反時ロールバック
    - _Requirements: 6.1, 6.4, 6.6_
  - [ ]* 5.2 Property 10, 11のプロパティテストとAPI結合テストを作成
    - **Property 10: バッチ保存時Root_Task event_at不変条件**
    - **Property 11: ルート移動時event_at入力強制**
    - pytest + httpx使用
    - **Validates: Requirements 5.8, 6.6**

- [ ] 6. 統合とバッチ保存連携
  - [ ] 6.1 EditModeServiceの`save`メソッドとAPI連携を実装
    - バッファ→BatchOperation変換、API呼び出し、成功時モード遷移
    - 失敗時のエラー通知・リトライ表示
    - _Requirements: 6.1, 6.4, 6.5_
  - [ ]* 6.2 統合テストを作成
    - 保存正常系・ロールバック・バリデーションエラーのE2Eフロー
    - _Requirements: 6.1, 6.4, 6.6_

- [ ] 7. 最終チェックポイント
  - 全テストがパスすることを確認し、不明点があればユーザーに質問する。

## Notes

- `*` 付きタスクはオプション（スキップ可能）
- フロントエンド: TypeScript / Angular、バックエンド: Python / FastAPI
- プロパティテストはfast-check（フロントエンド）とhypothesis/pytest（バックエンド）使用
- 各タスクは対応するRequirementsを参照し追跡可能

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.5"] },
    { "id": 3, "tasks": ["2.4", "2.6", "4.1", "4.2"] },
    { "id": 4, "tasks": ["4.3", "4.4", "5.1"] },
    { "id": 5, "tasks": ["5.2", "6.1"] },
    { "id": 6, "tasks": ["6.2"] }
  ]
}
```
