# 設計ドキュメント

## Meta

- **バージョン**: v1.0

## Overview
タスクCRUD・ツリー構造・データ分離を提供するサービス層の設計。一覧取得時にtask_contentsをJOINしないことでレスポンス性能を確保するためデータ分離とした。

## Architecture
Task_Serviceがビジネスロジック（バリデーション・カスケード削除）を集約し、Repository層がデータアクセスを担う。トランザクション管理はService層で行う。

## Components and Interfaces
```python
class TaskService(Protocol):
    async def create(self, input: CreateTaskInput) -> Task: ...
    async def get_by_id(self, id: UUID, include_content: bool = False) -> TaskWithChildren: ...
    async def get_tree(self) -> list[Task]: ...
    async def update(self, id: UUID, input: UpdateTaskInput) -> UpdateResult: ...
    async def delete(self, id: UUID) -> None: ...
    # 完了遷移（progress=100 or status='complete'）検出時は task-completion-logic spec を参照。
    # update()は完了遷移を検出した場合、内部的にcomplete()を呼び出す。

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
    parent_id: str | None = None
    estimated_time: int | None = None
    actual_time: int | None = None
    sort_order: float | None = None
    task_type: Literal['TODO', 'SCHEDULE'] | None = None
    export_flag: bool | None = None
    update_last_done: bool = True
    tz_offset: int | None = None      # 分単位、last_done_at更新時必須（task-last-done spec参照）
    # UNSET vs null判定: Pydantic v2の model_fields_set で未指定と明示的nullを区別する。
    # Root_Task不変条件: 結果がRoot_Task(parent_id=null)ならevent_at non-null必須。
```

## Data Models
PostgreSQL ENUM: task_type_enum(`'TODO'|'SCHEDULE'`)、task_status_enum(`'incomplete'|'complete'`)、priority_enum(`'none'|'priority'|'highest'`)

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

階層制限（最大10レベル）はService層でparent_idチェーン走査により検証。アプリケーション層で制御とした理由は再帰クエリコスト回避と制限値の柔軟な変更のため。

**Root_Task event_at不変条件**: Root_Task（parent_id=null）はevent_at non-null必須。(1) Root_Taskのevent_at→null更新は拒否、(2) Child_Task→Root昇格時は同一操作内event_at指定or既存non-null必須、(3) Root→Child降格時はevent_at保持（降格後のnull化は別途更新で許可）。

**preview/detail_flag導出**: preview=notesの最初の改行or100文字（null/空白時は空文字列）。detail_flag=task_contentsに非空白内容があればtrue。

## Correctness Properties
### Property 1: 部分更新は未指定フィールドを保存する
**Validates: Requirements 3.1**
*For any* 部分更新リクエストにおいて、未指定フィールドは更新前後で同一値を保持すること。

### Property 2: カスケード削除の完全性
**Validates: Requirements 4.1, 4.2**
*For any* タスクツリーにおいて、ルート削除時に全子孫+関連task_contentsが削除されること。

### Property 3: preview導出の正当性
**Validates: Requirements 5.3, 5.4**
*For any* notes文字列において、preview=最初の改行or100文字の短い方。null/空白時は空文字列。

### Property 4: detail_flagの整合性
**Validates: Requirements 5.5, 5.6**
*For any* task_contentsにおいて、非空白内容ありならtrue、全null/空白ならfalse。

### Property 5: Root_Task event_at不変条件の全経路保証
**Validates: Requirements 1.2, 3.5, 3.6, 3.7**
*For any* create/update/move操作において、結果がRoot_Task（parent_id=null）となるタスクのevent_atがnullなら拒否。降格時はevent_at保持。

## Error Handling
| エラー種別 | 条件 | レスポンス |
|---|---|---|
| validation_error | 必須フィールド欠落、範囲外の値、不正なenum値 | 400 + フィールド別エラー詳細 |
| not_found | 指定IDのタスク/親タスクが存在しない | 404 + 対象ID |
| hierarchy_limit | 子タスク追加で階層が10を超える | 400 + 現在の深さ情報 |
| root_event_at_required | Root_Taskのevent_atがnullとなる更新・移動・昇格操作 | 400 + 「Root_Taskにはevent_atが必須です」 |
| transaction_error | カスケード操作中の失敗 | 500 + ロールバック完了通知 |

統一フォーマット `{ error: { code, message, details? } }` で返却。トランザクション失敗時は必ずロールバック。

## Testing Strategy
- **プロパティテスト**: hypothesisを使用し、上記5プロパティを各100回以上のランダム入力で検証。Property 5はcreate/update(event_at=null)/update(parent_id=null)の全経路でRoot_Task event_at不変条件を検証。タグ: `Feature: task-crud, Property N: {text}`
- **ユニットテスト**: バリデーション境界値、デフォルト値、not-found、階層制限（深さ10/11）。pytest使用
- **統合テスト**: トランザクションロールバック、カスケード削除の原子性、DB制約整合性。testcontainersでPostgreSQLコンテナを使用
