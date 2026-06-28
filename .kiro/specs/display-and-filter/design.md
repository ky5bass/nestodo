# 設計ドキュメント: display-and-filter

## Meta

- **バージョン**: v1.2

## Overview

タスクリストのツリー表示、詳細パネル遷移、グローバルフィルター（effective_at算出・表示条件・先祖包含）、日付境界、および詳細パネルからの一覧即時反映を実現する設計。フロントエンドは`TaskListComponent`と`TaskListService`、バックエンドは`FilterService`と専用エンドポイントで構成する。

**設計判断**: フィルターロジックをサーバーサイドに集約した。クライアントに全タスクを送信してフィルターするとデータ量が増大し、ロジックの二重管理が発生するためである。

## Architecture

```
TaskListComponent (Angular)
├── TaskRowComponent (再帰的ツリー描画)
└── TaskListService (API呼び出し・パネル状態管理)
        └── GET /api/tasks?filtered=true
                └── FilterService (Python: effective_at算出 → 条件判定 → 先祖包含)
```

**設計判断**: パネル状態管理をTaskListServiceに持たせた。コンポーネント間で共有が必要な状態（選択中タスクID、パネル開閉）をサービスに集約し、各コンポーネントはSignalで購読するだけとするためである。

## Components and Interfaces

### FilterService (Python - Backend)

```python
class FilterService:
    def compute_effective_at(self, task: Task, ancestors: list[Task]) -> datetime | None: ...
    def evaluate_visibility(self, task: Task, effective_at: datetime | None, today: date) -> bool: ...
    def get_filtered_tree(self, all_tasks: list[Task], now: datetime, timezone_offset: int) -> list[Task]: ...
    def get_day_boundary(self, now: datetime, timezone_offset: int) -> tuple[datetime, datetime]: ...
```

**設計判断**: `timezone_offset`をクライアントから受け取る方式とした。サーバーがユーザーのローカル時刻を知る必要があり、ユーザーごとにタイムゾーンが異なるためである。

### TaskListService (Angular - Frontend)

```typescript
@Injectable({ providedIn: 'root' })
export class TaskListService {
  readonly tasks = signal<TaskTreeNode[]>([]);
  readonly selectedTaskId = signal<string | null>(null);
  readonly isPanelOpen = signal<boolean>(false);

  loadTasks(): void;
  selectTask(taskId: string): void;  // トグル動作含む
  closePanel(): void;
  updateTaskLocally(taskId: string, field: string, value: unknown): void; // 一覧即時反映
  rollbackTaskLocally(taskId: string, field: string, previousValue: unknown): void; // エラー時ロールバック
}
```

**設計判断**: 詳細パネルでの保存成功後にtasks Signalをローカルで直接更新する方式とした。API再取得を行わず、Optimistic UIの延長としてフロントエンドで完結させることで、レスポンスを待たず一覧に即反映できるためである。サーバーエラー時のロールバックも一覧側に反映し、一貫性を保つ。

### TaskRowComponent (Angular - Frontend)

```typescript
@Component({ selector: 'app-task-row', standalone: true })
export class TaskRowComponent {
  @Input() node: TaskTreeNode;
  @Input() depth: number;
}
```

## Data Models

### API レスポンス

```typescript
interface TaskTreeNode {
  id: string;
  task_name: string;
  event_at: string | null;
  estimated_time: number | null;
  actual_time: number | null;
  progress: number | null;
  priority: 'none' | 'priority' | 'highest';
  preview: string | null;
  sort_order: number;
  status: 'incomplete' | 'complete';
  children: TaskTreeNode[];
}
```

### フィルターリクエスト

```
GET /api/tasks?filtered=true&tz_offset=-540
```

`tz_offset`: クライアントのUTCオフセット（分単位、JSの`getTimezoneOffset()`値）

## Correctness Properties

*正しさの性質とは、システムのすべての有効な実行において成り立つべき特性や振る舞いの形式的な記述である。*

### Property 1: effective_at再帰算出の正当性

*任意の*タスクツリーにおいて、あるタスクのeffective_atは「自身のevent_at」がnullでなければその値、nullであれば祖先を親方向に辿り最初に見つかるnullでないevent_at、全てnullならnullと等しいこと。

**Validates: Requirements 3.1, 3.2, 3.3**

### Property 2: effective_at算出の非破壊性

*任意の*タスクツリーに対しeffective_atを算出した後、全タスクのevent_atフィールドが算出前と同一の値を保持すること。

**Validates: Requirements 3.4**

### Property 3: フィルター条件の正当性

*任意の*タスクとDay_Boundary基準の本日日付において、(a)未完了かつeffective_at<=本日+1ヶ月なら表示、(b)完了かつlast_done_at=本日なら表示、(c)未完了かつeffective_at=nullなら除外、のいずれかに正しく分類されること。

**Validates: Requirements 4.1, 4.2, 4.3**

### Property 4: 先祖包含の閉包性

*任意の*フィルター済みタスク集合において、表示対象タスクからルートまでの経路上の全祖先が表示対象に含まれること。かつ、自身も子孫も条件を満たさないタスクは含まれないこと。

**Validates: Requirements 5.1, 5.2, 5.3**

### Property 5: Day_Boundary日付計算

*任意の*タイムスタンプにおいて、午前5時を境界とした論理日付が正しく算出されること。具体的には、午前5時以降は当日、午前5時未満は前日として扱われること。

**Validates: Requirements 6.1, 6.2**

### Property 6: 兄弟タスクのソート順不変条件

*任意の*兄弟タスクリストにおいて、フィルター後の表示順がsort_orderの昇順を維持すること。

**Validates: Requirements 1.6**

### Property 7: パネルトグル状態の整合性

*任意の*タスクIDのクリックシーケンスにおいて、同一タスクの連続クリックはパネルの開閉をトグルし、異なるタスクのクリックはパネルを開いたまま対象を切り替えること。

**Validates: Requirements 2.2, 2.3**

### Property 8: 一覧即時反映の整合性

*任意の*フィールド更新に対し、DetailSaveServiceの保存成功後にTaskListServiceのtasks Signal内の該当タスクの該当フィールドが新しい値に更新されていること。サーバーエラー時は変更前の値に戻ること。

**Validates: Requirements 7.1, 7.2, 7.3**

## Error Handling

| エラー種別 | 条件 | レスポンス |
|---|---|---|
| invalid_tz_offset | tz_offsetが-720〜840の範囲外 | 400 + バリデーションエラー |
| tree_fetch_error | DB接続失敗・タイムアウト | 500 + リトライ可能通知 |
| empty_result | フィルター結果が0件 | 200 + 空配列（エラーではない） |

フロントエンド: API失敗時はSnackBarで通知し、前回のキャッシュデータを表示維持する。ユーザーの作業を中断させないという考えからエラー時もUIを維持する方針とした。

## Testing Strategy

**プロパティテスト**: hypothesisを使用し、Property 1〜6をバックエンドで各100回以上検証。fast-checkを使用し、Property 7をフロントエンドで100回以上検証。タグ: `Feature: display-and-filter, Property N: {text}`

**ユニットテスト**: Priority→CSS classマッピング、preview表示/非表示の条件分岐、Escキー/Xボタンによるパネル閉じ。Angular TestBed + pytest使用。

**結合テスト**: フィルター付きAPI呼び出しの正常系（ツリー構造維持確認）、タイムゾーン境界値。testcontainersでPostgreSQLコンテナを使用。
