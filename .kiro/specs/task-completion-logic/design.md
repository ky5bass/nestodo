# 設計ドキュメント

## Meta

- **バージョン**: v1.0

## Overview
タスクの完了遷移に関するビジネスロジックの設計。進捗・ステータス双方向連動と、サーバー側DB状態による一括完了判定を提供する。

## Architecture
Task_Serviceのupdate()が完了遷移（progress=100 or status='complete'）を検出した場合、内部的にcomplete()を呼び出すことで全完了経路で同一の判定ロジックを適用する。これを「完了経路一元化不変条件」と呼ぶ。

## Components and Interfaces
```python
class TaskService(Protocol):
    async def complete(self, id: UUID, confirmed: bool, tz_offset: int) -> CompleteResult: ...
    # update()は完了遷移検出時に内部的にcomplete()を呼び出す。
    # これにより PUT /api/tasks/{id} でprogress=100を送信した場合も、
    # TaskService.complete()直接呼び出しと同一の未完了子孫チェックが適用される。

class UpdateResult(BaseModel):
    type: Literal['updated', 'completed', 'confirmation_required']
    task: Task | None = None
    pending_children: list[PendingChild] | None = None  # confirmation_required時のみ

class CompleteResult(BaseModel):
    type: Literal['completed', 'confirmation_required']
    task: Task | None = None
    pending_children: list[PendingChild] | None = None

class PendingChild(BaseModel):
    id: UUID
    task_name: str
    status: str
```

**完了経路一元化不変条件**: タスクが完了状態に遷移する全サーバー経路（`update(progress=100)`、`update(status='complete')`、`complete()`直接呼び出し）は、同一の一括完了判定ロジック（DB上の未完了子孫再帰チェック）を通ること。`update()`は完了遷移を検出した場合、内部的に`complete()`を呼び出すことでこれを保証する。したがって`UpdateResult`にも`confirmation_required`が含まれる。

**判定ロジック**: complete()はDB上の未完了子孫を再帰クエリで判定し、存在すればconfirmation_requiredを返す。confirmed=trueの場合のみ深さ優先順で全子孫のstatus='complete'、progress=100を設定する。

**ステータス連動ルール**: progress=100→status='complete'自動設定。逆方向（status戻し）はprogress<100同時指定必須。

## Data Models
tasksテーブルのstatus, progressカラムを使用する。テーブル定義の詳細はtask-crud specを参照。

## Correctness Properties
### Property 1: 進捗・ステータス双方向連動
**Validates: Requirements 1.1, 1.2, 1.3**
*For any* タスクにおいて、progress=100→status='complete'、status戻しにはprogress<100同時指定必須。

### Property 2: 一括完了の正当性（サーバー側一元判定）
**Validates: Requirements 2.1, 2.2, 2.3, 2.4**
*For any* 完了遷移リクエストにおいて、DB上の未完了子孫ありならconfirmation_required返却。confirmed=trueのみ全子孫完了。

## Error Handling
| エラー種別 | 条件 | レスポンス |
|---|---|---|
| status_conflict | progress<100なしでのステータス戻し | 400 + 必要条件の説明 |
| transaction_error | 一括完了中の失敗 | 500 + ロールバック完了通知 |

統一フォーマット `{ error: { code, message, details? } }` で返却。トランザクション失敗時は必ずロールバック。

## Testing Strategy
- **プロパティテスト**: hypothesisを使用し、上記2プロパティを各100回以上のランダム入力で検証。Property 2は複数API経路（PUT /api/tasks/{id}でprogress=100、TaskService.complete()）から完了遷移を発生させ同一判定を確認。タグ: `Feature: task-completion-logic, Property N: {text}`
- **ユニットテスト**: ステータス連動境界値、status_conflictエラー。pytest使用
- **統合テスト**: 一括完了のDB状態依存性（フィルター非表示の未完了子孫も検出されること）、トランザクションロールバック。testcontainersでPostgreSQLコンテナを使用
