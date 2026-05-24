# 設計ドキュメント

## Overview

タスクCRUD・ツリー構造・ステータス連動・一括完了・データ分離・最終実施日管理を提供するサービス層の設計。

## Architecture

Task_Serviceがビジネスロジック（バリデーション・連動・カスケード）を集約し、Repository層がデータアクセスを担う。トランザクション管理はService層で行う。一覧取得時にtask_contentsをJOINしないことでレスポンス性能を確保するためデータ分離とした。

## Components and Interfaces

```python
class TaskService(Protocol):
    async def create(self, input: CreateTaskInput) -> Task: ...
    async def get_by_id(self, id: UUID, include_content: bool = False) -> TaskWithChildren: ...
    async def get_tree(self) -> list[Task]: ...
    async def update(self, id: UUID, input: UpdateTaskInput) -> UpdateResult: ...
    async def delete(self, id: UUID) -> None: ...
    async def complete(self, id: UUID, confirmed: bool, tz_offset: int) -> CompleteResult: ...
    # update()は完了遷移検出時に内部的にcomplete()を呼び出す。complete()はDB上の未完了子孫を再帰クエリで判定。
    # tz_offsetは必須。即成功時は対象タスク、confirmed=true時は親と全子孫のlast_done_atをDay_Boundary基準の論理日付に設定する。

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
    tz_offset: int | None = None      # 分単位（JS getTimezoneOffset()値）、last_done_at更新時必須
    # UNSET vs null判定: Pydantic v2の model_fields_set で未指定と明示的nullを区別する。
    #   - field not in model_fields_set → 未指定（変更なし）
    #   - field in model_fields_set and value is None → 明示的null送信
    # Root_Task不変条件: 結果がRoot_Task(parent_id=null)ならevent_at non-null必須。
    # parent_id=nullへの変更時: 同一リクエスト内event_at指定 or 既存non-null必須。
    # Root→Child降格時: event_at保持。降格後のnull化は別途更新で可能。

class UpdateResult(BaseModel):
    type: Literal['updated', 'completed', 'confirmation_required']
    task: Task | None = None
    pending_children: list[PendingChild] | None = None  # confirmation_required時のみ

class CompleteResult(BaseModel):  # complete()専用。UpdateResultのサブセット
    type: Literal['completed', 'confirmation_required']
    task: Task | None = None
    pending_children: list[PendingChild] | None = None
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

**ビジネスルール**: progress=100→status='complete'自動設定。逆方向はprogress<100同時指定必須。update()は完了遷移検出時にcomplete()を内部呼び出し。一括完了判定はサーバー側DB状態から一元的に行い、未完了子孫ありならconfirmation_required、confirmed=trueで深さ優先全子孫完了。preview=notesの最初の改行or100文字（null/空白時は空文字列）。detail_flag=task_contentsに非空白内容があればtrue。last_done_at更新: (a) progress/actual_time更新+update_last_done=true、(b) complete()即成功時は対象タスク、(c) confirmed=true時は親+全子孫。tz_offset+Day_Boundary(午前5時)基準でDATE型保存。tz_offset欠落/-720〜840範囲外はエラー。

**Root_Task event_at不変条件**: Root_Task（parent_id=null）はevent_at non-null必須。create/update/move/batch全経路で適用。(1) Root_Taskのevent_at→null更新は拒否、(2) Child_Task→Root昇格時は同一操作内event_at指定or既存non-null必須、(3) Root→Child降格時はevent_at保持（降格後のnull化は別途更新で許可）。

## Correctness Properties

### Property 1: 部分更新は未指定フィールドを保存する
*For any* 部分更新リクエストにおいて、未指定フィールドは更新前後で同一値を保持すること。 **Validates: Req 3.1**

### Property 2: カスケード削除の完全性
*For any* タスクツリーにおいて、ルート削除時に全子孫+関連task_contentsが削除されること。 **Validates: Req 4.1, 4.2**

### Property 3: 進捗・ステータス双方向連動
*For any* タスクにおいて、progress=100→status='complete'、status戻しにはprogress<100同時指定必須。 **Validates: Req 5.1, 5.2, 5.3**

### Property 4: 一括完了の正当性（サーバー側一元判定）
*For any* 完了遷移リクエストにおいて、DB上の未完了子孫ありならconfirmation_required返却。confirmed=trueのみ全子孫完了。 **Validates: Req 6.1-6.4**

### Property 5: preview導出の正当性
*For any* notes文字列において、preview=最初の改行or100文字の短い方。null/空白時は空文字列。 **Validates: Req 7.3, 7.4**

### Property 6: detail_flagの整合性
*For any* task_contentsにおいて、非空白内容ありならtrue、全null/空白ならfalse。 **Validates: Req 7.5, 7.6**

### Property 7: last_done_at条件付き更新とtz_offset検証
*For any* 非Completion_Trigger更新において、progress/actual_time+update_last_done=trueの場合のみlast_done_at更新。tz_offset欠落/範囲外はエラー。 **Validates: Req 8.1-8.3, 8.5**

### Property 8: 完了遷移時のlast_done_at設定
*For any* 完了遷移において、(a) 即成功時は対象タスク、(b) confirmed=true時は親+全子孫のlast_done_atを設定。tz_offset不正時はエラー。 **Validates: Req 8.6, 8.7**

### Property 9: Root_Task event_at不変条件の全経路保証
*For any* create/update/move/batch操作において、結果がRoot_Task（parent_id=null）となるタスクのevent_atがnullなら拒否。降格時はevent_at保持。 **Validates: Req 1.2, 3.5, 3.6, 3.7**

## Error Handling

| エラー種別 | 条件 | レスポンス |
|---|---|---|
| validation_error | 必須フィールド欠落、範囲外の値、不正なenum値 | 400 + フィールド別エラー詳細 |
| root_event_at_required | Root_Taskのevent_atがnullとなる更新・移動・昇格操作 | 400 + 「Root_Taskにはevent_atが必須です」 |
| invalid_tz_offset | tz_offsetが欠落または-720〜840の範囲外（last_done_at更新時・一括完了時） | 400 + バリデーションエラー |
| not_found | 指定IDのタスク/親タスクが存在しない | 404 + 対象ID |
| hierarchy_limit | 子タスク追加で階層が10を超える | 400 + 現在の深さ情報 |
| status_conflict | progress<100なしでのステータス戻し | 400 + 必要条件の説明 |
| transaction_error | カスケード操作中の失敗 | 500 + ロールバック完了通知 |

統一フォーマット `{ error: { code, message, details? } }` で返却。トランザクション失敗時は必ずロールバック。

## Testing Strategy

- **プロパティテスト**: hypothesisを使用し、上記9プロパティを各100回以上のランダム入力で検証。Property 4は複数API経路（PUT /api/tasks/{id}でprogress=100、TaskService.complete()）から完了遷移を発生させ同一判定を確認。Property 7はtz_offset境界値（4:59/5:00）と異なるtz_offset値での論理日付算出を検証。Property 8は単体完了成功時の対象タスクおよび一括完了時の全子孫last_done_at設定を検証。Property 9はcreate/update(event_at=null)/update(parent_id=null)/batch moveの全経路でRoot_Task event_at不変条件を検証。タグ: `Feature: task-management-core, Property N: {text}`
- **ユニットテスト**: バリデーション境界値、デフォルト値、not-found、階層制限（深さ10/11）、tz_offset欠落・範囲外エラー。pytest使用
- **統合テスト**: トランザクションロールバック、カスケード削除の原子性、DB制約整合性、一括完了のDB状態依存性（フィルター非表示の未完了子孫も検出されること）、Day_Boundary境界値（4:59/5:00）でのlast_done_at算出。testcontainersでPostgreSQLコンテナを使用