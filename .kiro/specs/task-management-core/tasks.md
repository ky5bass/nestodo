# Implementation Plan: タスク管理コア

## Overview

FastAPI + SQLAlchemy構成でタスクCRUD、ツリー構造、ステータス連動、一括完了、データ分離、最終実施日管理を段階的に実装する。

## Tasks

- [ ] 1. データモデルとプロジェクト基盤
  - [ ] 1.1 SQLAlchemyモデル定義（tasks, task_contents）
    - PostgreSQL ENUM型（task_type_enum, task_status_enum, priority_enum）を定義
    - tasksテーブル・task_contentsテーブルのモデルクラスを作成
    - 階層構造用の自己参照リレーションを設定
    - _要件: 7.1, 7.2_
  - [ ] 1.2 Pydanticスキーマ定義（入出力モデル）
    - CreateTaskInput, UpdateTaskInput, UpdateResult, CompleteResult等を定義
    - model_fields_setによるUNSET/null判定の仕組みを実装
    - _要件: 1.1, 1.4, 3.1_
  - [ ] 1.3 Repository層の実装
    - TaskRepository（CRUD操作、再帰ツリー取得、子孫取得）を実装
    - _要件: 2.1, 2.2, 4.1_

- [ ] 2. タスク作成・読み取り
  - [ ] 2.1 TaskService.create()の実装
    - バリデーション（必須フィールド、文字数、Root_Task event_at必須）
    - 階層制限チェック（最大10レベル）、デフォルト値設定
    - _要件: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_
  - [ ] 2.2 TaskService.get_by_id() / get_tree()の実装
    - 単一タスク+直下子タスク取得、ツリー再帰取得
    - task_contents明示リクエスト時の別フィールド返却
    - _要件: 2.1, 2.2, 2.3, 2.4, 2.5_
  - [ ]* 2.3 作成・読み取りのユニットテスト
    - バリデーション境界値、デフォルト値、not-found、階層制限テスト
    - _要件: 1.5, 1.6, 1.7, 2.4_

- [ ] 3. チェックポイント - テスト確認
  - 全テストがパスすることを確認し、不明点があればユーザーに質問する。

- [ ] 4. タスク更新とステータス連動
  - [ ] 4.1 TaskService.update()の実装（部分更新・バリデーション）
    - model_fields_setによる未指定/null判定、フィールド別バリデーション
    - Root_Task event_at不変条件、昇格/降格ロジック
    - _要件: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_
  - [ ] 4.2 ステータス連動ロジックの実装
    - progress=100→status='complete'自動設定
    - ステータス戻し時のprogress<100同時指定必須チェック
    - 完了遷移検出時のcomplete()内部呼び出し
    - _要件: 5.1, 5.2, 5.3_
  - [ ]* 4.3 プロパティテスト: 部分更新の未指定フィールド保存
    - **Property 1: 部分更新は未指定フィールドを保存する**
    - **検証対象: 要件 3.1**
  - [ ]* 4.4 プロパティテスト: 進捗・ステータス双方向連動
    - **Property 3: 進捗・ステータス双方向連動**
    - **検証対象: 要件 5.1, 5.2, 5.3**
  - [ ]* 4.5 プロパティテスト: Root_Task event_at不変条件
    - **Property 9: Root_Task event_at不変条件の全経路保証**
    - **検証対象: 要件 1.2, 3.5, 3.6, 3.7**

- [ ] 5. 削除と一括完了
  - [ ] 5.1 TaskService.delete()の実装
    - カスケード削除（全子孫+task_contents）、トランザクション管理
    - _要件: 4.1, 4.2, 4.3, 4.4_
  - [ ] 5.2 TaskService.complete()の実装
    - 未完了子孫の再帰チェック、confirmation_required返却
    - confirmed=trueでの深さ優先全子孫完了、ロールバック処理
    - _要件: 6.1, 6.2, 6.3, 6.4, 6.5_
  - [ ]* 5.3 プロパティテスト: カスケード削除の完全性
    - **Property 2: カスケード削除の完全性**
    - **検証対象: 要件 4.1, 4.2**
  - [ ]* 5.4 プロパティテスト: 一括完了の正当性
    - **Property 4: 一括完了の正当性（サーバー側一元判定）**
    - **検証対象: 要件 6.1, 6.2, 6.3, 6.4**

- [ ] 6. チェックポイント - テスト確認
  - 全テストがパスすることを確認し、不明点があればユーザーに質問する。

- [ ] 7. データ分離と最終実施日
  - [ ] 7.1 Task_Content CRUD + preview/detail_flag自動導出
    - notes→preview導出（最初の改行or100文字）、detail_flag自動設定
    - _要件: 7.3, 7.4, 7.5, 7.6_
  - [ ] 7.2 last_done_at自動更新ロジックの実装
    - tz_offset+Day_Boundary(午前5時)基準の論理日付算出
    - update_last_done=true/false分岐、完了遷移時の優先適用
    - _要件: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_
  - [ ]* 7.3 プロパティテスト: preview導出とdetail_flag整合性
    - **Property 5: preview導出の正当性**
    - **Property 6: detail_flagの整合性**
    - **検証対象: 要件 7.3, 7.4, 7.5, 7.6**
  - [ ]* 7.4 プロパティテスト: last_done_at条件付き更新
    - **Property 7: last_done_at条件付き更新とtz_offset検証**
    - **Property 8: 完了遷移時のlast_done_at設定**
    - **検証対象: 要件 8.1, 8.2, 8.3, 8.5, 8.6, 8.7**

- [ ] 8. APIエンドポイントと統合
  - [ ] 8.1 FastAPIルーター実装
    - POST/GET/PUT/DELETE /api/tasks エンドポイント定義
    - エラーハンドリング（統一フォーマット）、レスポンスモデル設定
    - _要件: 1.1, 2.1, 3.1, 4.1, 6.1_
  - [ ]* 8.2 統合テスト
    - トランザクションロールバック、カスケード削除原子性
    - 一括完了のDB状態依存性、Day_Boundary境界値テスト
    - _要件: 4.4, 6.5, 8.4_

- [ ] 9. 最終チェックポイント
  - 全テストがパスすることを確認し、不明点があればユーザーに質問する。

## Notes

- `*` 付きタスクはオプションでありスキップ可能
- 各タスクは対応する要件番号を参照し追跡可能性を確保
- プロパティテストはhypothesisライブラリを使用
- 統合テストはtestcontainersでPostgreSQLコンテナを使用

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["2.1", "2.2"] },
    { "id": 3, "tasks": ["2.3", "4.1"] },
    { "id": 4, "tasks": ["4.2"] },
    { "id": 5, "tasks": ["4.3", "4.4", "4.5", "5.1"] },
    { "id": 6, "tasks": ["5.2"] },
    { "id": 7, "tasks": ["5.3", "5.4", "7.1"] },
    { "id": 8, "tasks": ["7.2"] },
    { "id": 9, "tasks": ["7.3", "7.4", "8.1"] },
    { "id": 10, "tasks": ["8.2"] }
  ]
}
```
