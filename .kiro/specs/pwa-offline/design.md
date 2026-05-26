# 設計ドキュメント: オフライン対応

## Overview

PWA基盤（pwa-install spec）の上に、オフライン時のUX向上機能を実装する。カスタム実装はオフライン通知バナー、HTTPインターセプター、DetailSaveServiceのpendingキュー拡張の3点に限定する。

**前提**: pwa-install specによりService Worker登録・App Shellキャッシュが完了していること。

## Architecture

構成要素:
- `OfflineBannerComponent` — オフライン通知UI
- `offlineInterceptor` — オフライン時HTTPエラーハンドリング
- `DetailSaveService` pendingキュー拡張 — オフライン時の入力保持と自動リトライ

## Components and Interfaces

### オフライン通知バナー

```typescript
@Component({
  selector: 'app-offline-banner',
  standalone: true,
  template: `
    @if (isOffline()) {
      <div class="offline-banner" role="alert">オフラインです。一部の変更はオンライン復帰後に自動保存されます。</div>
    }
  `,
})
export class OfflineBannerComponent implements OnDestroy {
  isOffline = signal(!navigator.onLine);
  private recoveryTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }

  private handleOnline = () => {
    if (this.recoveryTimer !== null) { clearTimeout(this.recoveryTimer); }
    this.recoveryTimer = setTimeout(() => {
      this.isOffline.set(false);
      this.recoveryTimer = null;
    }, 3000);
  };

  private handleOffline = () => {
    if (this.recoveryTimer !== null) { clearTimeout(this.recoveryTimer); this.recoveryTimer = null; }
    this.isOffline.set(true);
  };

  ngOnDestroy() {
    if (this.recoveryTimer !== null) { clearTimeout(this.recoveryTimer); }
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
  }
}
```

**設計判断**: Angular Signals使用。単純な状態管理にはRxJSより簡潔。3秒遅延は要件1.2に基づく。復帰タイマーを保持し、再オフライン時にキャンセルすることで要件1.3との整合性を保証する。

### HTTPエラーインターセプター

```typescript
export const offlineInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error) => {
      if (!navigator.onLine) {
        return throwError(() => new OfflineError(req.url));
      }
      return throwError(() => error);
    }),
  );
};
```

### pendingキューのデータ構造と振る舞い

```typescript
interface PendingItem {
  taskId: string;
  field: string;
  value: unknown;
  previousValue: unknown; // リトライ失敗時のロールバック用
  options?: SaveOptions;
  type: 'field' | 'content';
}
// キー: `${taskId}:field:${field}` or `${taskId}:content:${field}`
// Map<string, PendingItem>
```

**設計判断**: `previousValue`を保持することで、リトライ失敗時に正しくロールバックできる。同一キーへの連続書き込み時は最新の`value`で上書きするが、`previousValue`は最初のpending登録時の値を維持する。

#### 自動リトライ対象

| API | キー | 対象 |
|-----|------|------|
| `saveField` | `${taskId}:field:${field}` | 個別フィールド更新（status, progress, priority等）。ただし Completion_Trigger 経路（batch-completion-ui による `status=complete` / `progress=100`）は除く |
| `saveContent` | `${taskId}:content:${field}` | テキストコンテンツ更新（pre_info, notes, reflection） |

**設計判断**: batch-completion-uiとbatch-edit-modeは各spec独自のエラーハンドリングを持つため自動リトライ対象外。Completion_Trigger経路の`saveField`はサーバー側で子タスク状態確認が必要であり、自動リトライでは整合性を保証できないため除外する。

#### DetailSaveService内のエラーハンドリング拡張

```typescript
if (error instanceof OfflineError) {
  const key = isContentField ? `${taskId}:content:${field}` : `${taskId}:field:${field}`;
  this.pendingQueue.set(key, { taskId, field, value, previousValue, options, type: isContentField ? 'content' : 'field' });
} else {
  this.rollback(taskId, field, previousValue);
}
```

## Data Models

本specではDB変更なし。オフライン時のpendingキューはメモリ上のMap（`Map<string, PendingItem>`）で管理し、永続化しない。

## Error Handling

| シナリオ | 対応 |
|---------|------|
| オフライン時API（saveField/saveContent） | OfflineError → UIロールバックなし → pendingキュー追加 |
| オフライン時API（batch系） | OfflineError → 各specの既存エラーハンドリングに従う |
| オンライン復帰後リトライ失敗 | previousValueでUIロールバック＋Snackbar通知 |

## Correctness Properties

PBTは適用しない。状態遷移が2値（online/offline）かつ遷移パスが限定的であり、境界条件を網羅的にユニットテストで列挙可能なため。

### Property 1: オフラインバナー状態一貫性

onLine=falseでisOffline=true、onLine=trueで3秒後にisOffline=false。3秒以内に再オフラインになった場合は復帰タイマーがキャンセルされ、isOffline=trueが維持される。

**Validates: Requirements 1.1, 1.2, 1.3**

### Property 2: インターセプター冪等性

オフライン時は常にOfflineError、オンライン時は元エラーをそのまま再throw。

**Validates: Requirements 2.1, 2.2**

## Testing Strategy

- **ユニットテスト**: OfflineBannerComponentの表示切替・3秒遅延・再オフラインキャンセル、offlineInterceptorのエラーハンドリング、pendingキューの追加・上書き・リトライ・ロールバック
