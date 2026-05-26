# 設計ドキュメント: PWA基盤

## Overview

Angularの公式PWAサポート（`@angular/pwa`）を活用し、最小限のカスタムコードでPWA化を実現する。`@angular/service-worker`のService Worker管理・キャッシュ戦略・更新検知をそのまま利用し、設定ファイル（manifest.webmanifest, ngsw-config.json）の配置とapp.config.tsへのprovider追加のみで基盤を構築する。

**設計判断**: Angular公式PWA基盤はngsw-config.jsonによる宣言的キャッシュ設定、SwUpdateによる更新管理で要件を十分カバーする。独自SW実装より保守性・安定性が高いため、フレームワーク機能を最大限活用する。

## Architecture

構成要素:
- `manifest.webmanifest` — PWAメタデータ（アイコン、表示モード、色）
- `ngsw-config.json` — Service Workerキャッシュ戦略の宣言的設定
- `ngsw-worker.js` — Angularが生成するService Worker（ビルド時自動生成）

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
| SW更新検出 | 全タブ閉じ後の次回ロードで有効化 |

## Correctness Properties

PBTは適用しない。設定ファイルの構造検証はユニットテストで十分カバー可能なため。

### Property 1: manifest完全性

必須フィールド（name, short_name, theme_color, background_color, display, scope, start_url, icons）を全て含む。

**Validates: Requirements 1.1, 1.4, 4.1, 4.2, 4.3**

### Property 2: App Shellキャッシュ網羅性

app-shell assetGroupがindex.html・CSS・JSを全てprefetch対象に含む。

**Validates: Requirements 3.1, 3.2**

## Testing Strategy

- **ユニットテスト**: manifest必須フィールド検証、ngsw-config構造検証
- **統合テスト**: ビルド成果物の存在確認（ngsw-worker.js, manifest.webmanifest）、Lighthouse PWA監査
