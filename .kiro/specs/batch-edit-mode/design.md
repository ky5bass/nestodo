# 設計ドキュメント: batch-edit-mode

## Overview

一括編集モードの状態管理・変更バッファ・Undo/Redo・sort_order算出・バッチ保存を実現する設計。フロントエンドは`EditModeService`と`SortOrderCalculator`、バックエンドは`PATCH /api/tasks/batch`で構成する。

**設計判断**: 変更をクライアント側バッファに蓄積し一括送信する方式。操作ごとのAPI呼び出しはUX悪化とトランザクション整合性の問題があるため。sort_order算出もD&Dリアルタイムフィードバックのためフロントエンドに配置。

## Architecture

```
TaskListComponent (Angular)
├── EditModeToolbarComponent (保存/キャンセル/Undo/Redo/フィルター解除)
├── TaskRowComponent (インライン編集・ドラッグハンドル・削除ボタン)
└── EditModeService (Signal-based状態管理)
    ├── ChangeBuffer / HistoryStack
    └── SortOrderCalculator (sort_order算出・リバランス)
```

## Components and Interfaces

### EditModeService (Angular)

```typescript
@Injectable({ providedIn: 'root' })
export class EditModeService {
  readonly isEditMode = signal<boolean>(false);
  readonly changeBuffer = signal<Operation[]>([]);
  readonly undoStack = signal<Operation[]>([]);
  readonly redoStack = signal<Operation[]>([]);
  readonly filterDisabled = signal<boolean>(false);
  readonly hasChanges = computed(() => this.changeBuffer().length > 0);
  enterEditMode(): void;
  exitEditMode(): void;
  applyOperation(op: Operation): void; // バッファ追加 + undo push + redo clear
  undo(): void;
  redo(): void;
  save(): Observable<void>;
  cancel(): void;
}
```

### SortOrderCalculator (Angular - 純粋関数staticクラス、PBTに最適)

```typescript
export class SortOrderCalculator {
  static midpoint(prev: number, next: number): number;        // (prev + next) / 2
  static appendToEnd(last: number): number;                   // last + 1.0
  static prependToHead(first: number): number;                // first - 1.0
  static needsRebalance(prev: number, next: number): boolean; // gap < 0.001
  static rebalance(siblings: { id: string; sort_order: number }[]): { id: string; sort_order: number }[];
}
```

### バッチ保存API (FastAPI)

```python
@router.patch("/api/tasks/batch")
async def batch_update(operations: list[BatchOperation], db: AsyncSession = Depends(get_db)):
    """単一トランザクションで全操作を適用。全操作適用後の最終状態に対し、
    Root_Task event_at必須不変条件と最大10階層制限を検証。違反時はバッチ全体をロールバック。"""
```

**設計判断**: バッチ保存時バリデーションは「全操作適用後の最終状態」に対して行う。中間状態での一時的な不変条件違反は許容し最終整合性のみ保証。操作順序依存を排除しバッファリング自由度を確保。

## Data Models

### Operation型 (フロントエンド)

```typescript
type Operation =
  | { type: 'rename'; taskId: string; oldName: string; newName: string }
  | { type: 'create'; tempId: string; name: string; parentId: string | null;
      sortOrder: number; taskType: 'TODO' | 'SCHEDULE'; eventAt?: string }
  | { type: 'delete'; taskId: string; descendants: string[] }
  | { type: 'move'; taskId: string; newSortOrder: number;
      newParentId: string | null; eventAt?: string;
      rebalanced?: { id: string; sortOrder: number }[] };
```

**設計判断**: move.newParentIdは必須フィールドとし、同一親内移動でも現在の親ID（またはnull）を明示送信する。「未指定」と「ルートへ移動(null)」の曖昧さを排除。undo用旧値もOperation自体に含めundo可能とした。

### BatchOperation (APIリクエスト)

```python
class BatchOperation(BaseModel):
    type: Literal["rename", "create", "delete", "move"]
    task_id: str | None = None
    name: str | None = None
    new_parent_id: str | None = None  # move時必須。null=ルートへ移動、UUID=指定親へ移動
    sort_order: float | None = None
    task_type: Literal["TODO", "SCHEDULE"] | None = None
    event_at: datetime | None = None  # Root昇格時に必要
    descendants: list[str] | None = None
    # move時new_parent_id必須（同一親内でも明示）。未送信はmodel_validatorでvalidation_error。
```

## Correctness Properties

### Property 1: sort_order中間値算出
*任意の* prev < next に対し、`midpoint(prev, next)` は prev < result < next を満たすこと。 **Validates: Req 3.2, 5.2**

### Property 2: sort_order境界値算出
*任意の*兄弟リストに対し、`prependToHead(first)` < first、`appendToEnd(last)` > last。 **Validates: Req 3.3, 5.4, 5.5**

### Property 3: リバランスの順序保存と等間隔性
*任意の*兄弟リストに対し、`rebalance`後は元の相対順序を保持し1.0始まりの等間隔。 **Validates: Req 5.3, 5.7**

### Property 4: Change_Bufferの操作記録完全性
*任意の*有効操作に対し、`applyOperation`後のChange_Bufferは全必須フィールドを含むこと。 **Validates: Req 2.2, 3.1, 4.1, 5.6**

### Property 5: タスク名バリデーション
*任意の*空文字列/255文字超に対し、rename操作はバッファに追加されないこと。 **Validates: Req 2.3**

### Property 6: カスケード削除の完全性
*任意の*ノード削除時、全子孫IDがOperation.descendantsに含まれること。 **Validates: Req 4.2**

### Property 7: 階層制限の強制
*任意の*移動操作で移動後深さが10超の場合、操作は拒否されること。 **Validates: Req 5.1**

### Property 8: Undo/Redoラウンドトリップ
*任意の*操作列に対し、全undo後バッファ空、全redo後バッファは元と等価。 **Validates: Req 7.1-7.3, 7.7**

### Property 9: フィルター切替時のバッファ保持
*任意の*バッファ状態でフィルターオン/オフ切替後もバッファ不変。 **Validates: Req 8.4**

### Property 10: バッチ保存時のRoot_Task event_at不変条件
*任意の*バッチ操作列で最終状態のRoot_Taskのevent_atがnullならバッチ全体ロールバック。 **Validates: Req 5.8, 6.6**

### Property 11: ルート移動時のevent_at入力強制
*任意の*Child_Task→ルート移動でevent_atがnullなら、ダイアログ入力なしではmove操作不追加。 **Validates: Req 5.8**

## Error Handling

| エラー種別 | 条件 | 対応 |
|---|---|---|
| validation_error | タスク名が空 or 255文字超 | インラインエラー表示、バッファリング防止 |
| depth_limit | 移動後の階層が10超 | ドロップ不可のビジュアルフィードバック |
| root_event_at_required | ルート移動時にevent_atがnull | event_at入力ダイアログ表示、入力なしはドロップ拒否 |
| batch_invariant_violation | バッチ適用後にRoot_Task event_at不変条件 or 階層制限違反 | バッチ全体ロールバック、SnackBarでエラー表示 |
| batch_save_failed | API 4xx/5xx | 編集モード維持、SnackBarでリトライ表示 |
| conflict_error | 他ユーザーが同タスクを変更済み | エラー通知、リロード提案 |

**設計判断**: バッチ保存失敗時にモードを維持する。ユーザーの編集作業を失わせないため。

## Testing Strategy

**プロパティテスト**: fast-checkでProperty 1〜11を各100回以上検証。Property 10はバックエンド結合テストでも検証。タグ: `Feature: batch-edit-mode, Property N: {text}`
**ユニットテスト**: モード遷移、確認ダイアログ、undo/redo有効/無効、フィルター初期状態、ルート移動時event_atダイアログ。Angular TestBed使用。
**結合テスト**: バッチ保存正常系、ロールバック、バリデーションエラー、Root_Task不変条件違反、Child→Root昇格パターン。pytest + httpx使用。
