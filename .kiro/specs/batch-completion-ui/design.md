# 設計ドキュメント: batch-completion-ui

## Overview

親タスク完了時の一括完了確認モーダルUI、Optimistic UI例外ルーティング、キャンセル時のロールバックを実現する設計。`BatchCompletionModalComponent`と`DetailSaveService`の拡張で構成する。

**設計判断**: DetailSaveServiceにCompletion_Trigger判定ロジックを追加し、親タスクの場合のみOptimistic UIをバイパスする方式とした。モーダル表示の責務をDetailPanel側に残すことで、既存のDetailSaveServiceの単一責任（保存フロー制御）を維持するためである。

## Architecture

```
TaskDetailPanelComponent
├── BatchCompletionModalComponent (MatDialog)
└── DetailSaveService (拡張: completion routing)
        └── TaskService.complete(id, confirmed)
```

**設計判断**: モーダルをMatDialogで実装し、DetailPanelから直接開く方式とした。専用サービスを挟まないことで、確認フローの状態遷移をシンプルに保つためである。

## Components and Interfaces

### DetailSaveService 拡張

```typescript
// 既存のsaveFieldに追加するルーティングロジック
saveField(taskId: string, field: string, value: unknown, options?: SaveFieldOptions): void {
  if (this.isCompletionTrigger(field, value) && this.hasChildren(taskId)) {
    this.startCompletionFlow(taskId, field, value); // Optimistic UI skip
    return;
  }
  // 従来のOptimistic UIフロー
}

private isCompletionTrigger(field: string, value: unknown): boolean;
private hasChildren(taskId: string): boolean;
private startCompletionFlow(taskId: string, field: string, value: unknown): void;
```

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
interface CompleteResult {
  type: 'completed' | 'confirmation_required';
  task?: Task;
  pending_children?: PendingChild[];
}
```

**設計判断**: PendingChildにtask_nameを含める拡張をtask-management-core側に要求した。モーダルでユーザーが影響範囲を判断するにはIDだけでは不十分であるためである。

## Correctness Properties

*正しさの性質とは、システムのすべての有効な実行において成り立つべき特性や振る舞いの形式的な記述である。*

### Property 1: Completion_Triggerルーティング

*任意の*タスクとCompletion_Trigger（status=完了 or progress=100）に対し、子タスクを持つ場合はOptimistic UIをスキップしTaskServiceへ直接リクエストし、子タスクを持たない場合は従来のOptimistic UIフローを実行すること。

**Validates: Requirements 1.1, 1.4, 2.1, 2.4**

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

- Property 1: ランダムなタスク（子あり/なし）× トリガー種別で、ルーティング先を検証
- Property 2: ランダムなprogress値(0〜99)でキャンセル後の復元を検証
- Property 3: ランダムな長さ(1〜50)のPendingChildリストで表示件数と残件数を検証

**ユニットテスト**: モーダルの静的コンテンツ（メッセージ、ボタン）、ローディング状態、esc/backdrop閉じ、リトライ動作。Angular TestBed使用。

**結合テスト**: DetailPanel → DetailSaveService → TaskService → Modal → confirm/cancelの一連フロー。TaskServiceモックを使用。
