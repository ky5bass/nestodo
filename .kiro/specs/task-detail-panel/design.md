# 設計ドキュメント: task-detail-panel

**バージョン: v1.3**

## Overview

タスク詳細パネルの属性表示・インライン編集・Optimistic UI保存を実現する設計。パネル本体（`TaskDetailPanelComponent`）、作業時間入力（`TimeInputComponent`）、カレンダーピッカー（`CalendarPickerComponent`）、進捗スライダー（`ProgressSliderComponent`）、ステータス戻しモーダル（`RevertModalComponent`）、保存サービス（`DetailSaveService`）で構成する。

**設計判断**: コンポーネントを機能単位で分割し、保存ロジックをサービスに集約した。これはAngularのDI機構を活かしてテスト容易性を確保し、Optimistic UI・デバウンス・ロールバックの責務を一箇所に閉じるためである。

## Architecture

```
TaskDetailPanelComponent
├── TaskTypeRadioComponent (種別ラジオボタン)
├── CalendarPickerComponent (期限/開始日時)
│     └── TimePickerComponent (時刻選択)
├── StatusToggleComponent (ステータストグルスイッチ)
├── PrioritySegmentComponent (優先度セグメントコントロール)
├── ProgressSliderComponent (進捗スライダー)
├── TimeInputComponent (estimated_time / actual_time)
├── RevertModalComponent (完了→未完了時)
└── DetailSaveService (Optimistic UI + debounce + rollback)
        └── PUT /api/tasks/{id} | PUT /api/tasks/{id}/contents
```

**設計判断**: 各フィールド編集を個別APIコールとした。一括保存ではなく個別保存とすることで、デバウンス単位を細かく制御でき、競合リスクを最小化できるためである。

## Components and Interfaces

### TaskTypeRadioComponent

```typescript
@Component({ selector: 'app-task-type-radio', standalone: true })
export class TaskTypeRadioComponent {
  @Input() value: 'TODO' | 'SCHEDULE';
  @Output() valueChange = new EventEmitter<'TODO' | 'SCHEDULE'>();
}
```

**設計判断**: ラジオボタンUIとした。選択肢が2つだけ（TODO/予定）であり、ドロップダウンよりワンタップで操作が完結するためである。選択変更時に即保存を発火する。

### CalendarPickerComponent

```typescript
@Component({ selector: 'app-calendar-picker', standalone: true })
export class CalendarPickerComponent {
  @Input() value: string | null; // ローカル日時文字列 'YYYY-MM-DDTHH:mm:ss'（タイムゾーン情報なし。UTC instant ではない）
  @Output() valueChange = new EventEmitter<string | null>();

  readonly SHORTCUTS = [
    { label: '今日', offsetDays: 0 },
    { label: '明日', offsetDays: 1 },
    { label: '1週間後', offsetDays: 7 },
  ];
  
  selectShortcut(offsetDays: number): void; // 該当日付をセットしピッカーを閉じる
}
```

**設計判断**: ショートカットボタンを配置した。ユーザーの大半が「今日」「明日」「1週間後」を設定するという操作性向上の要望を受けたためである。ショートカット押下でカレンダーが閉じるのは、選択完了を明示するためである。

### TimePickerComponent

```typescript
@Component({ selector: 'app-time-picker', standalone: true })
export class TimePickerComponent {
  @Input() hours: number;   // 0-23
  @Input() minutes: number; // 0, 5, 10, ..., 55
  @Output() timeChange = new EventEmitter<{ hours: number; minutes: number }>();

  readonly MINUTE_STEP = 5;
  readonly HOUR_MIN = 0;
  readonly HOUR_MAX = 23;
  readonly MINUTE_MIN = 0;
  readonly MINUTE_MAX = 55;
}
```

**設計判断**: 時間・分は端で止まりループしない仕様とした。ループにより意図しない値になる使いにくさを解消するためである（承認済みコメントで明示された判断）。5分刻みとしたのは、分単位の精度と操作の手軽さのバランスを取るためである。

### StatusToggleComponent

```typescript
@Component({ selector: 'app-status-toggle', standalone: true })
export class StatusToggleComponent {
  @Input() isComplete: boolean;
  @Output() toggle = new EventEmitter<boolean>(); // true=完了, false=未完了
}
```

**設計判断**: トグルスイッチとした。ステータスは2値（完了/未完了）であり、見た目の変更として最も直感的なUIであるため。完了→未完了時のRevert_Modalは維持し、安全弁を残す判断は承認済みコメントで明示されたとおりである。

### PrioritySegmentComponent

```typescript
@Component({ selector: 'app-priority-segment', standalone: true })
export class PrioritySegmentComponent {
  @Input() value: 'none' | 'priority' | 'highest';
  @Output() valueChange = new EventEmitter<'none' | 'priority' | 'highest'>();
}
```

**設計判断**: セグメントコントロール（3ボタン横並び）とした。選択肢が3つで全て常に表示されるため、ドロップダウンより現在値と選択肢が一目で分かり操作が速いためである。

### ProgressSliderComponent

```typescript
@Component({ selector: 'app-progress-slider', standalone: true })
export class ProgressSliderComponent {
  @Input() value: number; // 0-100
  @Output() valueChange = new EventEmitter<number>();
}
```

**設計判断**: 0〜100の連続値スライダーとした。既存のTimeInputComponent（離散値スライダー）とは異なり、進捗は連続的な割合を表すため連続値が自然である。TimeInputの既存仕様は維持する（承認済みコメントで明示された判断）。

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
- **event_at送信仕様**: event_atフィールドの保存時、値は `YYYY-MM-DDTHH:mm:ss` 形式のローカル日時文字列として送信する。`toISOString()`やUTC変換は使用しない。`tz_offset`はevent_atの時刻変換には使用しない（`tz_offset`はlast_done_at更新・Day_Boundary・完了処理の「本日」判定専用）
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
  
  snapToNearest(input: number, steps: number[]): number; // 入力が0の場合は0を返す。1以上の場合は最近傍離散値を返す
}
```

**設計判断**: スライダーの離散値を定数配列で保持し、`snapToNearest`を純粋関数として実装する。テスト容易性とロジックの明確化のためである。

**設計判断（0入力対応）**: 0入力時はスナップ処理をバイパスして0をそのまま返す設計とした。各スライダーの離散値配列（MINUTE_STEPS, HOUR_STEPS, DAY_STEPS）に0は含まれていないため、スナップすると最小値（5, 1, 1）に丸められてしまい、ユーザーの意図（0分/0時間/0日）を表現できなくなるためである。バックエンドは既に `ge=0` で0を許容しているため、バックエンド変更は不要である。

**設計判断（バリデーション変更）**: テキストボックスのバリデーションを「1以上の整数」から「0以上の整数」に変更する。業務上データの扱いとの乖離を解消するための要望を受けたためである（Issue #26）。0入力時のスライダー位置は先頭（index=0）に留まる。

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

*任意の*タスクに対し、progressが100に設定された場合（スライダー操作・トグルスイッチ問わず）、statusは必ず完了状態となること。

**Validates: Requirements 3.1, 3.2, 11.2**

### Property 2: Time_Inputの最近傍スナップ

*任意の*0以上の整数入力に対し、`snapToNearest`関数は入力が0の場合は0をそのまま返し、1以上の場合は離散値配列内で入力値に最も近い値を返すこと。等距離の場合は小さい方を返すこと。

**Validates: Requirements 5.6**

### Property 3: Optimistic UIの整合性

*Completion_Triggerを除く任意の*フィールド編集に対し、サーバー成功時はUIが新しい値を維持し、サーバーエラー時はUIが編集前の値にロールバックされること。Completion_Trigger時はbatch-completion-uiのサーバー確認フローに従う。

**Validates: Requirements 7.1, 7.2**

### Property 4: デバウンスは最新値のみ送信

*任意の*同一フィールドへの連続編集シーケンスに対し、デバウンス期間経過後にサーバーへ送信される値は最後に入力された値のみであること。

**Validates: Requirements 7.4**

### Property 5: Time_Pickerの端止まり不変条件

*任意の*操作シーケンスにおいて、Time_Pickerの時間は0〜23、分は0〜55の範囲を超えないこと。端に達した場合は値が変化しないこと（ループしない）。

**Validates: Requirements 10.5**

### Property 6: ショートカットボタンの日付設定

*任意の*基準日に対し、「今日」「明日」「1週間後」のショートカットボタンが設定する日付は、それぞれ基準日+0日、+1日、+7日と等しいこと。

**Validates: Requirements 10.2, 10.3**

### Property 7: event_atローカル日時の保存・表示不変条件

*任意の*日付・時刻選択操作に対し、フロントエンドが送信するevent_atの値は`YYYY-MM-DDTHH:mm:ss`形式のタイムゾーン情報なし文字列であり、サーバーからの保存成功レスポンスに含まれるevent_atの値と同一であること。また、レスポンス反映後のUI表示時刻がユーザーの選択値から変化しないこと。tz_offsetはevent_atの値の変換に使用されないこと。

**Validates: Requirements 10.8, 10.9**

## Error Handling

| エラー種別 | 対応 |
|-----------|------|
| バリデーションエラー (progress範囲外, time入力不正) | フィールド横にエラーメッセージ表示、保存を実行しない |
| サーバーエラー (4xx/5xx) | UIロールバック + リトライ付きSnackBar通知 |
| ネットワークエラー | サーバーエラーと同様の処理 |

## Testing Strategy

**単体テスト**: 各コンポーネントの表示・条件分岐・バリデーションをexample-basedで検証。Angular TestBedを使用。

**プロパティテスト**: [fast-check](https://github.com/dubzzz/fast-check)を使用し、上記の正しさの性質を各100回以上のランダム入力で検証。

- Property 1: ランダムなprogress値(0-100)設定後のstatus状態を検証
- Property 2: ランダムな0以上の整数に対し、0入力時は0を返すこと、1以上の入力時はsnapToNearestが最近傍離散値を返すことを検証
- Property 3: Completion_Triggerを除くランダムなフィールド×値の組み合わせで成功/失敗時のUI状態を検証
- Property 4: ランダムな編集シーケンス生成後、送信値が最終値のみであることを検証
- Property 5: ランダムな操作シーケンス（増減連打）でTime_Pickerの時間(0-23)・分(0-55)が範囲外にならないことを検証
- Property 6: ランダムな基準日に対し、各ショートカットボタンが正しいオフセット日を設定することを検証
- Property 7: ランダムな日付時刻選択に対し、送信値が`YYYY-MM-DDTHH:mm:ss`形式であること、レスポンス値と一致すること、tz_offsetがevent_at変換に使用されないことを検証

**結合テスト**: API呼び出しのモックを用いたDetailSaveServiceのE2Eフロー検証。
