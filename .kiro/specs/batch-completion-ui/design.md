# 設計ドキュメント: batch-completion-ui

## Overview

親タスク完了時の一括完了確認モーダルUI、Optimistic UI例外ルーティング、キャンセル時のロールバックを実現する設計。`BatchCompletionModalComponent`と`DetailSaveService`の拡張で構成する。

**設計判断**: DetailSaveServiceにCompletion_Trigger判定ロジックを追加し、Completion_Trigger発生時は常にサーバーへ問い合わせる方式とした。フロントエンドでの子タスク有無判定（hasChildren）を廃止し、サーバー側DB状態を唯一の判定源とすることで、フィルター済みツリーで非表示の未完了子孫を見落とすリスクを排除するためである。

## Architecture

```
TaskDetailPanelComponent
├── BatchCompletionModalComponent (MatDialog)
└── DetailSaveService (拡張: completion routing)
        └── PUT /api/tasks/{id} (完了遷移リクエスト、tz_offset付き)
            └── サーバー側: TaskService.update() → 完了遷移検出 → complete()同一判定
```

**設計判断**: モーダルをMatDialogで実装し、DetailPanelから直接開く方式とした。専用サービスを挟まないことで、確認フローの状態遷移をシンプルに保つためである。

## Components and Interfaces

### DetailSaveService 拡張

```typescript
// 既存のsaveFieldに追加するルーティングロジック
saveField(taskId: string, field: string, value: unknown, options?: SaveFieldOptions): void {
  if (this.isCompletionTrigger(field, value)) {
    this.startCompletionFlow(taskId, field, value); // 常にサーバー確認フロー、tz_offset付き
    return;
  }
  // 従来のOptimistic UIフロー
}

private isCompletionTrigger(field: string, value: unknown): boolean;
// hasChildren()は使用しない。子の有無はサーバー側で判定する。
private startCompletionFlow(taskId: string, field: string, value: unknown): void;
// startCompletionFlowはtz_offset（new Date().getTimezoneOffset()）を付与して完了リクエストを送信する。
// サーバー側ではPUT /api/tasks/{id}経由のupdate(progress=100/status='complete')であっても、
// TaskService.update()が内部的にTaskService.complete()と同一の一括完了判定ロジックへ委譲する。
```

**設計判断**: フロントエンドでの`hasChildren()`判定を廃止し、Completion_Trigger発生時は常にサーバーへ問い合わせる方式とした。display-and-filterによるフィルター済みツリーでは非表示の未完了子孫を見落とす可能性があるため、DB状態を唯一の真実の源泉とする。サーバーからtype='completed'が返れば即UI反映、type='confirmation_required'が返ればモーダル表示という単純な分岐となる。

### BatchCompletionModalComponent

```typescript
export interface BatchCompletionModalData {
  taskName: string;
  pendingChildren: PendingChild[];
}
export type BatchCompletionModalResult = 'confirm' | 'cancel';

@Component({ selector: 'app-batch-completion-modal', standalone: true })
export class BatchCompletionModalComponent {
  readonly DISPLAY_LIMIT = 10;
  readonly displayedChildren: PendingChild[];
  readonly remainingCount: number;
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
}
```

## Data Models

### PendingChild（フロントエンド）

```typescript
interface PendingChild {
  task_id: string;
  task_name: string;
  status: 'incomplete';
}
```

### CompleteResult（TaskServiceレスポンス、task-management-coreで定義済み）

```typescript
// TaskService.complete()はCompleteResult、TaskService.update()はUpdateResultを返す
// フロントエンドはいずれもtypeフィールドで分岐する
interface CompleteResult {
  type: 'completed' | 'confirmation_required';
  task?: Task;
  pending_children?: PendingChild[];
}
```

**設計判断**: PendingChildにtask_nameを含める拡張をtask-management-core側に要求した。モーダルでユーザーが影響範囲を判断するにはIDだけでは不十分であるためである。

## Correctness Properties

*正しさの性質とは、システムのすべての有効な実行において成り立つべき特性や振る舞いの形式的な記述である。*

### Property 1: Completion_Triggerルーティング（サーバー一元判定）

*任意の*タスクとCompletion_Trigger（status=完了 or progress=100）に対し、フロントエンドは常にOptimistic UIをスキップしtz_offset付きでTaskServiceへ完了リクエストを送信すること。レスポンスのtype='completed'の場合はUI反映、type='confirmation_required'の場合はモーダル表示すること。フロントエンド側で子タスクの有無を判定しないこと。

**Validates: Requirements 1.1, 1.2, 1.3, 2.1, 2.4**

### Property 2: キャンセル時のロールバック

*任意の*タスクの元progress値（0〜99）に対し、確認モーダルでキャンセルされた場合、progressフィールドは元の値に復元され、statusは未完了のまま維持されること。

**Validates: Requirements 2.2, 4.7**

### Property 3: 未完了子孫リストの表示とトランケーション

*任意の*未完了子孫リスト（1件以上）に対し、モーダルはmin(リスト長, 10)件のタスク名・ステータスを表示し、10件超の場合は残件数を正確に表示すること。

**Validates: Requirements 3.2, 3.3**

## Error Handling

| エラー種別 | 条件 | 対応 |
|---|---|---|
| completion_request_failed | TaskService.complete()のAPI失敗 | ローディング解除、SnackBarでエラー通知、UIは変更なし |
| batch_confirm_failed | confirmed=trueリクエストの失敗 | モーダル内にエラーメッセージ＋リトライボタン表示 |
| network_error | 通信不可 | completion_request_failedと同様の処理 |

**設計判断**: 一括完了のエラーはモーダル内で完結させる方式とした。既存のDetailSaveServiceのロールバック機構を使わないことで、ユーザーがモーダル内でリトライ判断できるためである。

## Testing Strategy

**プロパティテスト**: fast-checkを使用し、Property 1〜3をフロントエンドで各100回以上検証。タグ: `Feature: batch-completion-ui, Property N: {text}`

- Property 1: ランダムなタスク × トリガー種別で、常にtz_offset付きでサーバーへリクエストが送信されることを検証。レスポンスtype別のUI分岐（completed→UI反映、confirmation_required→モーダル表示）を検証
- Property 2: ランダムなprogress値(0〜99)でキャンセル後の復元を検証
- Property 3: ランダムな長さ(1〜50)のPendingChildリストで表示件数と残件数を検証

**ユニットテスト**: モーダルの静的コンテンツ（メッセージ、ボタン）、ローディング状態、esc/backdrop閉じ、リトライ動作。Angular TestBed使用。

**結合テスト**: DetailPanel → DetailSaveService → TaskService → レスポンスtype分岐 → Modal/UI反映の一連フロー。TaskServiceモックを使用。サーバー側一元判定の検証として、フロントエンドが子タスクの有無を判定せずサーバーレスポンスのみに従うことを確認。
