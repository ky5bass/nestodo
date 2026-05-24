# 設計ドキュメント: task-detail-panel

## Overview

タスク詳細パネルの属性表示・インライン編集・Optimistic UI保存を実現する設計。パネル本体（`TaskDetailPanelComponent`）、作業時間入力（`TimeInputComponent`）、ステータス戻しモーダル（`RevertModalComponent`）、保存サービス（`DetailSaveService`）の4要素で構成する。

**設計判断**: コンポーネントを機能単位で分割し、保存ロジックをサービスに集約した。これはAngularのDI機構を活かしてテスト容易性を確保し、Optimistic UI・デバウンス・ロールバックの責務を一箇所に閉じるためである。

## Architecture

```
TaskDetailPanelComponent
├── TimeInputComponent (estimated_time / actual_time)
├── RevertModalComponent (完了→未完了時)
└── DetailSaveService (Optimistic UI + debounce + rollback)
        └── PUT /api/tasks/{id} | PUT /api/tasks/{id}/contents
```

**設計判断**: 各フィールド編集を個別APIコールとした。一括保存ではなく個別保存とすることで、デバウンス単位を細かく制御でき、競合リスクを最小化できるためである。

## Components and Interfaces

### DetailSaveService

```typescript
@Injectable({ providedIn: 'root' })
export class DetailSaveService {
  saveField(taskId: string, field: string, value: unknown, options?: { update_last_done?: boolean; tz_offset?: number }): void;
  saveContent(taskId: string, field: 'pre_info' | 'notes' | 'reflection', value: string): void;
  retry(taskId: string, field: string): void;
}
```

- `saveField`: Optimistic UIで即座にUI反映 → デバウンス(300ms) → API送信 → エラー時ロールバック
- 同一フィールドへの連続編集はデバウンスにより最新値のみ送信
- progress/actual_time編集時にupdate_last_done=trueの場合、tz_offset（`new Date().getTimezoneOffset()`の値）を付与して送信
- **例外**: Completion_Trigger（status=完了 or progress=100）の場合はOptimistic UIを適用せず、batch-completion-uiで定義されたサーバー確認フローに委譲する。この際もtz_offsetを付与する

### TimeInputComponent

```typescript
@Component({ selector: 'app-time-input', standalone: true })
export class TimeInputComponent {
  @Input() value: number; // 分単位の合計値
  @Output() valueChange = new EventEmitter<number>();
  
  readonly MINUTE_STEPS = [5, 10, 15, 20, 30, 45];
  readonly HOUR_STEPS = [1, 2, 3, 4, 6];
  readonly DAY_STEPS = [1, 2, 3, 4, 5, 7, 10, 15, 20];
  
  snapToNearest(input: number, steps: number[]): number; // 最近傍離散値を返す
}
```

**設計判断**: スライダーの離散値を定数配列で保持し、`snapToNearest`を純粋関数として実装する。テスト容易性とロジックの明確化のためである。

### RevertModalComponent

```typescript
export interface RevertResult { confirmed: boolean; progress?: number; }
```

- MatDialogで実装。確定時に0〜99の進捗値を返す。キャンセル時は`confirmed: false`。

## Data Models

### API リクエスト/レスポンス

```typescript
// PUT /api/tasks/{id} (個別フィールド更新)
interface TaskFieldUpdateRequest {
  field: string;
  value: unknown;
  update_last_done?: boolean; // progress, actual_time編集時のみ
  tz_offset?: number;        // update_last_done=true時またはCompletion_Trigger時に必須（分単位、JS getTimezoneOffset()値）
}

// PUT /api/tasks/{id}/contents
interface TaskContentUpdateRequest {
  field: 'pre_info' | 'notes' | 'reflection';
  value: string;
}
```

**設計判断**: フィールド単位の更新APIとした。PATCH全体ではなく単一フィールド更新とすることで、デバウンスとOptimistic UIの実装がシンプルになり、同時編集時の競合も最小化できるためである。

### 状態遷移ルール

- `progress = 100` → `status`は自動的に完了に設定
- `status`を未完了に戻す → `RevertModal`経由で`progress`を0〜99に設定必須

## Correctness Properties

*正しさの性質とは、システムのすべての有効な実行において成り立つべき特性や振る舞いの形式的な記述である。*

### Property 1: Progress=100とStatus完了の不変条件

*任意の*タスクに対し、progressが100に設定された場合（手動入力・完了ボタン問わず）、statusは必ず完了状態となること。

**Validates: Requirements 3.3**

### Property 2: Time_Inputの最近傍スナップ

*任意の*正の整数入力に対し、`snapToNearest`関数は離散値配列内で入力値に最も近い値を返すこと。等距離の場合は小さい方を返すこと。

**Validates: Requirements 5.6**

### Property 3: Optimistic UIの整合性

*Completion_Triggerを除く任意の*フィールド編集に対し、サーバー成功時はUIが新しい値を維持し、サーバーエラー時はUIが編集前の値にロールバックされること。Completion_Trigger時はbatch-completion-uiのサーバー確認フローに従う。

**Validates: Requirements 7.1, 7.2**

### Property 4: デバウンスは最新値のみ送信

*任意の*同一フィールドへの連続編集シーケンスに対し、デバウンス期間経過後にサーバーへ送信される値は最後に入力された値のみであること。

**Validates: Requirements 7.4**

## Error Handling

| エラー種別 | 対応 |
|-----------|------|
| バリデーションエラー (progress範囲外, time入力不正) | フィールド横にエラーメッセージ表示、保存を実行しない |
| サーバーエラー (4xx/5xx) | UIロールバック + リトライ付きSnackBar通知 |
| ネットワークエラー | サーバーエラーと同様の処理 |

## Testing Strategy

**単体テスト**: 各コンポーネントの表示・条件分岐・バリデーションをexample-basedで検証。Angular TestBedを使用。

**プロパティテスト**: [fast-check](https://github.com/dubzzz/fast-check)を使用し、上記4つの正しさの性質を各100回以上のランダム入力で検証。

- Property 1: ランダムなprogress値(0-100)設定後のstatus状態を検証
- Property 2: ランダムな正整数に対するsnapToNearestの戻り値を検証
- Property 3: Completion_Triggerを除くランダムなフィールド×値の組み合わせで成功/失敗時のUI状態を検証
- Property 4: ランダムな編集シーケンス生成後、送信値が最終値のみであることを検証

**結合テスト**: API呼び出しのモックを用いたDetailSaveServiceのE2Eフロー検証。
