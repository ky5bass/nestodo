# 設計ドキュメント

## Overview

タスクCRUD・ツリー構造・ステータス連動・一括完了・データ分離・最終実施日管理を提供するサービス層の設計。

## Architecture

Task_Serviceがビジネスロジック（バリデーション・連動・カスケード）を集約し、Repository層がデータアクセスを担う。トランザクション管理はService層で行う。一覧取得時にtask_contentsをJOINしないことでレスポンス性能を確保するという考えからデータ分離とした。

## Components and Interfaces

```python
class TaskService(Protocol):
    async def create(self, input: CreateTaskInput) -> Task: ...
    async def get_by_id(self, id: UUID, include_content: bool = False) -> TaskWithChildren: ...
    async def get_tree(self) -> list[Task]: ...
    async def update(self, id: UUID, input: UpdateTaskInput) -> Task: ...
    async def delete(self, id: UUID) -> None: ...
    async def complete(self, id: UUID, confirmed: bool = False) -> CompleteResult: ...

class CreateTaskInput(BaseModel):
    task_name: str              # 1〜255文字
    task_type: Literal['TODO', 'SCHEDULE']
    sort_order: float           # 浮動小数点
    parent_id: UUID | None = None
    event_at: datetime | None = None  # Root_Taskは必須

class UpdateTaskInput(BaseModel):
    task_name: str | None = None
    progress: int | None = None       # 0〜100
    status: Literal['incomplete', 'complete'] | None = None
    priority: Literal['none', 'priority', 'highest'] | None = None
    event_at: datetime | None = None
    estimated_time: int | None = None
    actual_time: int | None = None
    sort_order: float | None = None
    task_type: Literal['TODO', 'SCHEDULE'] | None = None
    export_flag: bool | None = None
    update_last_done: bool = True

class CompleteResult(BaseModel):
    type: Literal['completed', 'confirmation_required']
    task: Task | None = None
    pending_children: list[PendingChild] | None = None
```

## Data Models

### PostgreSQL ENUM定義

```sql
CREATE TYPE task_type_enum AS ENUM ('TODO', 'SCHEDULE');
CREATE TYPE task_status_enum AS ENUM ('incomplete', 'complete');
CREATE TYPE priority_enum AS ENUM ('none', 'priority', 'highest');
```

### tasks テーブル

| カラム | 型 | 制約 |
|---|---|---|
| id | UUID | PK |
| parent_id | UUID | FK nullable |
| task_name | VARCHAR(255) | NOT NULL |
| task_type | PostgreSQL ENUM (task_type_enum) | NOT NULL |
| status | PostgreSQL ENUM (task_status_enum) | DEFAULT 'incomplete' |
| progress | SMALLINT | NULL, 0〜100 |
| priority | PostgreSQL ENUM (priority_enum) | DEFAULT 'none' |
| sort_order | FLOAT | NOT NULL |
| event_at | TIMESTAMP | Root_Task: NOT NULL |
| estimated_time | INT | NULL（分単位） |
| actual_time | INT | NULL（分単位） |
| preview | TEXT | NULL |
| detail_flag | BOOLEAN | DEFAULT false |
| export_flag | BOOLEAN | DEFAULT true |
| last_done_at | DATE | NULL |
| created_at / updated_at | TIMESTAMP | DEFAULT now() |

### task_contents テーブル

| カラム | 型 | 制約 |
|---|---|---|
| task_id | UUID | PK, FK → tasks.id |
| pre_info / notes / reflection | TEXT | NULL |

階層制限（最大10レベル）はService層でparent_idチェーン走査により検証する。再帰クエリのコストを避けつつ柔軟に制限値を変更可能にするという考えからアプリケーション層で制御とした。

**ビジネスルール**: progress=100→status='complete'自動設定。逆方向はprogress<100同時指定必須。一括完了は未完了子孫がある場合に確認要求を返却し、確認後に深さ優先で全子孫を完了。preview=notesの最初の改行or100文字。detail_flag=task_contentsに非空白内容があればtrue。last_done_at=progress/actual_time更新時にDay_Boundary(午前5時)基準の本日日付を設定（update_last_done=trueの場合のみ）。

## Correctness Properties

### Property 1: 部分更新は未指定フィールドを保存する

*For any* タスクと任意の部分更新リクエストにおいて、リクエストに含まれないフィールドは更新前後で同一の値を保持すること

**Validates: Requirements 3.1**

### Property 2: カスケード削除の完全性

*For any* タスクツリーにおいて、ルートを削除した場合、全子孫タスクおよび関連するtask_contentsレコードが全て削除されること

**Validates: Requirements 4.1, 4.2**

### Property 3: 進捗・ステータス双方向連動

*For any* タスクにおいて、progress=100設定時はstatus='complete'となり、status='incomplete'への戻しにはprogress<100が同一リクエスト内に必須であること

**Validates: Requirements 5.1, 5.2, 5.3**

### Property 4: 一括完了の正当性

*For any* 親タスクにおいて、確認付き一括完了後は自身と全子孫のstatusが'complete'かつprogressが100であること

**Validates: Requirements 6.1, 6.2, 6.3**

### Property 5: preview導出の正当性

*For any* notes文字列において、previewは最初の改行位置または100文字のいずれか短い方までのテキストとなること。notesがnull/空白のみの場合はpreviewが空文字列となること

**Validates: Requirements 7.3, 7.4**

### Property 6: detail_flagの整合性

*For any* task_contentsの状態において、いずれかのフィールドに空白以外の内容があればdetail_flag=true、全てnull/空白のみならdetail_flag=falseとなること

**Validates: Requirements 7.5, 7.6**

### Property 7: last_done_at条件付き更新

*For any* 更新リクエストにおいて、progress/actual_time更新かつupdate_last_done=trueの場合のみlast_done_atが本日日付に設定され、それ以外の場合はlast_done_atが変更されないこと

**Validates: Requirements 8.1, 8.2, 8.3**

## Error Handling

| エラー種別 | 条件 | レスポンス |
|---|---|---|
| validation_error | 必須フィールド欠落、範囲外の値、不正なenum値 | 400 + フィールド別エラー詳細 |
| not_found | 指定IDのタスク/親タスクが存在しない | 404 + 対象ID |
| hierarchy_limit | 子タスク追加で階層が10を超える | 400 + 現在の深さ情報 |
| status_conflict | progress<100なしでのステータス戻し | 400 + 必要条件の説明 |
| transaction_error | カスケード操作中の失敗 | 500 + ロールバック完了通知 |

統一フォーマット `{ error: { code, message, details? } }` で返却。部分的な変更を残さないという考えからトランザクション失敗時は必ずロールバックする。

## Testing Strategy

- **プロパティテスト**: hypothesisを使用し、上記7プロパティを各100回以上のランダム入力で検証。タグ: `Feature: task-management-core, Property N: {text}`
- **ユニットテスト**: バリデーション境界値（task_name 1文字/255文字/256文字）、デフォルト値、not-found、階層制限（深さ10/11）。pytest使用
- **統合テスト**: トランザクションロールバック、カスケード削除の原子性、DB制約との整合性。testcontainersでPostgreSQLコンテナを使用
