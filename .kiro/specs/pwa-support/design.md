# 設計ドキュメント: PWA対応

## Overview

Angularの公式PWAサポート（`@angular/pwa`）を活用し、最小限のカスタムコードでPWA化を実現する。`@angular/service-worker`のService Worker管理・キャッシュ戦略・更新検知をそのまま利用し、カスタム実装はオフライン通知バナー、HTTPインターセプター、DetailSaveServiceのオフラインpendingキュー拡張の3点に限定する。

**設計判断**: Angular公式PWA基盤はngsw-config.jsonによる宣言的キャッシュ設定、SwUpdateによる更新管理で要件を十分カバーする。独自SW実装より保守性・安定性が高いため、フレームワーク機能を最大限活用する。

## Architecture

構成要素:
- `manifest.webmanifest` — PWAメタデータ（アイコン、表示モード、色）
- `ngsw-config.json` — Service Workerキャッシュ戦略の宣言的設定
- `ngsw-worker.js` — Angularが生成するService Worker（ビルド時自動生成）
- `OfflineBannerComponent` — オフライン通知UI（カスタム実装）
- `offlineInterceptor` — オフライン時HTTPエラーハンドリング（カスタム実装）
- `DetailSaveService` pendingキュー拡張 — オフライン時の入力保持と自動リトライ（カスタム実装）

## Components and Interfaces

### Service Worker登録（フレームワーク提供）

```typescript
// app.config.ts
import { provideServiceWorker } from '@angular/service-worker';

export const appConfig: ApplicationConfig = {
  providers: [
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
```

**設計判断**: `registerWhenStable:30000`採用。アプリ安定後に登録、30秒で強制登録（setInterval等で安定到達しないケース対策）。

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
    // 既存タイマーをクリアし、複数回onlineイベント時のタイマー積み重なりを防止
    if (this.recoveryTimer !== null) {
      clearTimeout(this.recoveryTimer);
    }
    this.recoveryTimer = setTimeout(() => {
      this.isOffline.set(false);
      this.recoveryTimer = null;
    }, 3000);
  };

  private handleOffline = () => {
    // 復帰タイマーが走っている場合はキャンセルし、即座にオフライン表示
    if (this.recoveryTimer !== null) {
      clearTimeout(this.recoveryTimer);
      this.recoveryTimer = null;
    }
    this.isOffline.set(true);
  };

  ngOnDestroy() {
    if (this.recoveryTimer !== null) {
      clearTimeout(this.recoveryTimer);
    }
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
  }
}
```

**設計判断**: Angular Signals使用。単純な状態管理にはRxJSより簡潔。3秒遅延は要件4.2に基づく。`effect()`ではなく`OnDestroy`ライフサイクルでリスナー解除する（今回はリアクティブ依存が不要なため、`OnDestroy`で明示管理する方が意図が明確）。復帰タイマーを保持し、再オフライン時にキャンセルすることで要件4.1（オフライン中は常にバナー表示）との整合性を保証する。

### HTTPエラーインターセプター（オフライン時）

```typescript
export const offlineInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error) => {
      if (!navigator.onLine) {
        // オフライン時はユーザー入力を破棄せずエラーを通知
        return throwError(() => new OfflineError(req.url));
      }
      return throwError(() => error);
    }),
  );
};
```

### オフライン時のUI保持方針（保存系API別の振る舞い）

**設計判断**: オフライン時の自動リトライ対象を`DetailSaveService`の`saveField`と`saveContent`に限定する。batch-edit-modeとbatch-completion-uiはそれぞれ独自のエラーハンドリング（編集モード維持/モーダル内リトライ）を持つため、自動リトライキューには含めない。

#### 自動リトライ対象（pendingキュー管理）

| API | キー | 対象 |
|-----|------|------|
| `saveField` | `${taskId}:field:${field}` | 個別フィールド更新（status, progress, priority等）。ただし Completion_Trigger 経路（batch-completion-ui による `status=complete` / `progress=100`）は除く |
| `saveContent` | `${taskId}:content:${field}` | テキストコンテンツ更新（pre_info, notes, reflection） |

#### 自動リトライ対象外

| API | 理由 |
|-----|------|
| batch-completion-ui（完了確認フロー） | モーダル内でリトライUIを提供済み。サーバー側の子タスク状態確認が必要なため、自動リトライでは整合性を保証できない |
| batch-edit-mode（`PATCH /api/tasks/batch`） | 編集モード維持＋SnackBarリトライで対応済み。複数操作のトランザクション整合性が必要なため、個別リトライ不適 |

#### 具体的な振る舞い

- **オフライン時（対象API）**: `OfflineError`検出 → UIロールバックしない → 入力値を保持 → pendingキュー追加
- **オフライン時（対象外API）**: `OfflineError`検出 → 各specの既存エラーハンドリングに従う（モーダル内エラー表示/編集モード維持）
- **オンライン復帰時**: pendingキューのリクエストを順次自動リトライ → 成功時は保持値を確定、失敗時は`previousValue`でUIロールバック＋Snackbar通知

#### pendingキューのデータ構造

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

**設計判断**: `previousValue`を保持することで、オンライン復帰後のリトライ失敗時に正しくロールバックできる。同一キーへの連続書き込み時は最新の`value`で上書きするが、`previousValue`は最初のpending登録時の値を維持する（最終的にサーバーに反映されていた値に戻すため）。

```typescript
// DetailSaveService内のエラーハンドリング拡張（saveField / saveContent共通）
if (error instanceof OfflineError) {
  // ロールバックせず、pendingキューに追加（previousValueはリトライ失敗時のロールバック用）
  const key = isContentField ? `${taskId}:content:${field}` : `${taskId}:field:${field}`;
  this.pendingQueue.set(key, { taskId, field, value, previousValue, options, type: isContentField ? 'content' : 'field' });
} else {
  // 通常のサーバーエラー: UIロールバック + Snackbar
  this.rollback(taskId, field, previousValue);
}
```

## Data Models

本specではDB変更なし。Service WorkerのCache Storageのみ使用。

### ngsw-config.json

```json
{
  "index": "/index.html",
  "assetGroups": [
    { "name": "app-shell", "installMode": "prefetch",
      "resources": { "files": ["/favicon.ico", "/index.html", "/manifest.webmanifest", "/*.css", "/*.js"] } },
    { "name": "assets", "installMode": "lazy", "updateMode": "prefetch",
      "resources": { "files": ["/assets/**", "/*.(png|jpg|svg|ico)"] } }
  ]
}
```

**設計判断**: App Shellは`prefetch`、画像等は`lazy`。起動速度とストレージ効率のバランス。Angular SWはナビゲーションリクエストにプリキャッシュ済み`index.html`を返すため`offline.html`は不要。本アプリはシステムフォントのみ使用しカスタムフォントファイルを持たないため、app-shellにフォントリソースは含めない。

### manifest.webmanifest

必須フィールド: `name`, `short_name`, `theme_color`, `background_color`, `display: "standalone"`, `scope: "/"`, `start_url: "/"`。アイコン: 192x192(any), 512x512(any), 512x512(maskable)。

## Error Handling

| シナリオ | 対応 |
|---------|------|
| SW登録失敗 | console.error記録、アプリは通常動作継続 |
| SW非対応ブラウザ | enabled条件で自動スキップ |
| App Shellキャッシュ失敗 | インストール中断、次回再試行 |
| オフライン時API（saveField/saveContent） | `OfflineError`throw → UIロールバックなし → 入力値保持 → pendingキュー追加 → オンライン復帰後リトライ |
| オフライン時API（batch-completion/batch-edit） | `OfflineError`throw → 各specの既存エラーハンドリングに従う（自動リトライ対象外） |
| オンライン復帰後リトライ失敗 | `previousValue`でUIロールバック＋Snackbar通知 |
| SW更新検出 | 全タブ閉じ後の次回ロードで有効化 |

## Correctness Properties

PBTは適用しない。理由: 入力空間（online/offlineイベント列、エラー種別、設定構造）は存在するが、状態遷移が2値（online/offline）かつ遷移パスが限定的であり、境界条件（3秒タイマー中の再オフライン等）を網羅的にユニットテストで列挙可能なため、PBTによるランダム探索の費用対効果が低い。以下をユニットテスト・統合テストで検証する。

### Property 1: オフラインバナー状態一貫性

onLine=falseでisOffline=true、onLine=trueで3秒後にisOffline=false。3秒以内に再オフラインになった場合は復帰タイマーがキャンセルされ、isOffline=trueが維持される。

**Validates: Requirements 4.1, 4.2**

### Property 2: インターセプター冪等性

オフライン時は常に`OfflineError`、オンライン時は元エラーをそのまま再throw。

**Validates: Requirements 4.3**

### Property 3: manifest完全性

必須フィールド（name, short_name, theme_color, background_color, display, scope, start_url, icons）を全て含む。

**Validates: Requirements 1.1, 1.4, 5.1, 5.2, 5.3**

### Property 4: App Shellキャッシュ網羅性

app-shell assetGroupがindex.html・CSS・JSを全てprefetch対象に含む。

**Validates: Requirements 3.1, 3.2**

## Testing Strategy

- **ユニットテスト**: OfflineBannerComponentの表示切替・3秒遅延、offlineInterceptorのエラーハンドリング、manifest必須フィールド検証
- **統合テスト**: ビルド成果物の存在確認、Lighthouse PWA監査
