# 設計ドキュメント: batch-edit-mode

## Overview

一括編集モードの状態管理・変更バッファ・Undo/Redo・sort_order算出・バッチ保存を実現する設計。フロントエンドは`EditModeService`と`SortOrderCalculator`、バックエンドは`PATCH /api/tasks/batch`で構成する。

**設計判断**: 変更をクライアント側バッファに蓄積し一括送信する方式とした。操作ごとにAPIを呼ぶとネットワーク遅延でUXが悪化し、トランザクション整合性の担保も困難になるためである。sort_order算出もフロントエンドに配置した。D&D中のリアルタイムフィードバックにサーバー通信を挟むとレスポンスが悪化するためである。

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
    """単一トランザクションで全操作を適用"""
```

## Data Models

### Operation型 (フロントエンド)

```typescript
type Operation =
  | { type: 'rename'; taskId: string; oldName: string; newName: string }
  | { type: 'create'; tempId: string; name: string; parentId: string | null;
      sortOrder: number; taskType: 'TODO' | 'SCHEDULE'; eventAt?: string }
  | { type: 'delete'; taskId: string; descendants: string[] }
  | { type: 'move'; taskId: string; newSortOrder: number;
      newParentId?: string; rebalanced?: { id: string; sortOrder: number }[] };
```

**設計判断**: undo用の旧値（oldName等）をOperation自体に含めた。History_Stackが操作単体でundo可能にするためである。

### BatchOperation (APIリクエスト)

```python
class BatchOperation(BaseModel):
    type: Literal["rename", "create", "delete", "move"]
    task_id: str | None = None
    name: str | None = None
    parent_id: str | None = None
    sort_order: float | None = None
    task_type: Literal["TODO", "SCHEDULE"] | None = None
    event_at: datetime | None = None
    descendants: list[str] | None = None
```

## Correctness Properties

*正しさの性質とは、システムのすべての有効な実行において成り立つべき特性や振る舞いの形式的な記述である。*

### Property 1: sort_order中間値算出
*任意の*2つのsort_order値 prev < next に対し、`midpoint(prev, next)` は prev < result < next を満たすこと。
**Validates: Requirements 3.2, 5.2**

### Property 2: sort_order境界値算出
*任意の*兄弟リストに対し、`prependToHead(first)` は first より小さく、`appendToEnd(last)` は last より大きいこと。
**Validates: Requirements 3.3, 5.4, 5.5**

### Property 3: リバランスの順序保存と等間隔性
*任意の*兄弟リストに対し、`rebalance` 後の結果は元の相対順序を保持し、1.0から始まる等間隔の値であること。
**Validates: Requirements 5.3, 5.7**

### Property 4: Change_Bufferの操作記録完全性
*任意の*有効な操作（rename/create/delete/move）に対し、`applyOperation` 後のChange_Bufferはその操作の全必須フィールドを含むこと。
**Validates: Requirements 2.2, 3.1, 4.1, 5.6**

### Property 5: タスク名バリデーション
*任意の*空文字列または255文字超の文字列に対し、rename操作はChange_Bufferに追加されず、バッファの状態が操作前と同一であること。
**Validates: Requirements 2.3**

### Property 6: カスケード削除の完全性
*任意の*タスクツリーにおいて、あるノードを削除した場合、そのノードの全子孫IDがOperation.descendantsに含まれること。
**Validates: Requirements 4.2**

### Property 7: 階層制限の強制
*任意の*タスクツリーと移動操作において、移動後の深さ（対象+子孫の最大深さ）が10を超える場合、操作は拒否されること。
**Validates: Requirements 5.1**

### Property 8: Undo/Redoラウンドトリップ
*任意の*操作列に対し、全操作をundoした後のChange_Bufferは空であり、続けて全操作をredoした後のChange_Bufferは元の操作列と等価であること。
**Validates: Requirements 7.1, 7.2, 7.3, 7.7**

### Property 9: フィルター切替時のバッファ保持
*任意の*Change_Buffer状態において、フィルター解除のオン/オフ切替後もChange_Bufferの内容が変化しないこと。
**Validates: Requirements 8.4**

## Error Handling

| エラー種別 | 条件 | 対応 |
|---|---|---|
| validation_error | タスク名が空 or 255文字超 | インラインエラー表示、バッファリング防止 |
| depth_limit | 移動後の階層が10超 | ドロップ不可のビジュアルフィードバック |
| batch_save_failed | API 4xx/5xx | 編集モード維持、SnackBarでリトライ表示 |
| conflict_error | 他ユーザーが同タスクを変更済み | エラー通知、リロード提案 |

**設計判断**: バッチ保存失敗時にモードを維持する。ユーザーの編集作業を失わせないことを最優先とするため。

## Testing Strategy

**プロパティテスト**: fast-checkを使用し、Property 1〜9をフロントエンドで各100回以上検証。SortOrderCalculatorは純粋関数のためPBTに最適。タグ: `Feature: batch-edit-mode, Property N: {text}`

**ユニットテスト**: モード遷移の状態変化、確認ダイアログ表示条件、undo/redoボタンの有効/無効状態、フィルター解除チェックボックスの初期状態。Angular TestBed使用。

**結合テスト**: バッチ保存APIの正常系（全操作タイプ混在）、トランザクションロールバック、バリデーションエラー。pytest + httpx使用。
