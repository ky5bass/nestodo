# 設計ドキュメント: PWA対応

## Overview

Angularの公式PWAサポート（`@angular/pwa`）を活用し、最小限のカスタムコードでPWA化を実現する。`@angular/service-worker`のService Worker管理・キャッシュ戦略・更新検知をそのまま利用し、カスタム実装はオフライン通知バナーのみとする。

**設計判断**: Angular公式PWA基盤はngsw-config.jsonによる宣言的キャッシュ設定、SwUpdateによる更新管理で要件を十分カバーする。独自SW実装より保守性・安定性が高いため、フレームワーク機能を最大限活用する。

## Architecture

構成要素:
- `manifest.webmanifest` — PWAメタデータ（アイコン、表示モード、色）
- `ngsw-config.json` — Service Workerキャッシュ戦略の宣言的設定
- `ngsw-worker.js` — Angularが生成するService Worker（ビルド時自動生成）
- `OfflineBannerComponent` — オフライン通知UI（唯一のカスタム実装）

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
      <div class="offline-banner" role="alert">オフラインです。一部機能が制限されています。</div>
    }
  `,
})
export class OfflineBannerComponent {
  isOffline = signal(!navigator.onLine);
  constructor() {
    effect(() => {
      const handleOnline = () => setTimeout(() => this.isOffline.set(false), 3000);
      const handleOffline = () => this.isOffline.set(true);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    });
  }
}
```

**設計判断**: Angular Signals使用。単純な状態管理にはRxJSより簡潔。3秒遅延は要件4.2に基づく。

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

**設計判断**: App Shellは`prefetch`、画像等は`lazy`。起動速度とストレージ効率のバランス。Angular SWはナビゲーションリクエストにプリキャッシュ済み`index.html`を返すため`offline.html`は不要。

### manifest.webmanifest

必須フィールド: `name`, `short_name`, `theme_color`, `background_color`, `display: "standalone"`, `scope: "/"`, `start_url: "/"`。アイコン: 192x192(any), 512x512(any), 512x512(maskable)。

## Error Handling

| シナリオ | 対応 |
|---------|------|
| SW登録失敗 | console.error記録、アプリは通常動作継続 |
| SW非対応ブラウザ | enabled条件で自動スキップ |
| App Shellキャッシュ失敗 | インストール中断、次回再試行 |
| オフライン時API | `OfflineError`throw、UI表示＋入力データ保持 |
| SW更新検出 | 全タブ閉じ後の次回ロードで有効化 |

## Correctness Properties

PBTは適用しない（入力空間が存在しないため）。以下をユニットテスト・統合テストで検証する。

### Property 1: オフラインバナー状態一貫性

onLine=falseでisOffline=true、onLine=trueで3秒後にisOffline=false。

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
