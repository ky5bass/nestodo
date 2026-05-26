# Implementation Plan: PWA基盤

## Overview

Angular公式PWAサポート（`@angular/service-worker`）を活用し、manifest.webmanifest・ngsw-config.json・app.config.tsへのprovider追加でPWA基盤を構築する。

## Tasks

- [ ] 1. PWAアイコンとmanifestの作成
  - [ ] 1.1 PWAアイコン画像ファイルを配置する
    - `public/icons/` に 192x192(any)、512x512(any)、512x512(maskable) のPNGアイコンを配置
    - maskableアイコンは重要コンテンツが中心80%領域内に収まるよう作成
    - _Requirements: 4.1, 4.2_
  - [ ] 1.2 manifest.webmanifestを作成する
    - `public/manifest.webmanifest` に必須フィールドを定義
    - name（最大45文字）、short_name（最大12文字）、display: "standalone"、scope: "/"、start_url: "/"、theme_color、background_color、icons配列
    - _Requirements: 1.1, 1.3, 1.4, 4.1, 4.2, 4.3, 4.4_
  - [ ] 1.3 index.htmlにmanifestリンクを追加する
    - `<link rel="manifest" href="manifest.webmanifest">` をhead要素内に追加
    - _Requirements: 1.5_

- [ ] 2. Service Worker登録とキャッシュ設定
  - [ ] 2.1 `@angular/service-worker` パッケージをインストールする
    - `ng add @angular/service-worker` または手動でパッケージ追加
    - angular.jsonの`serviceWorker`設定を有効化
    - _Requirements: 2.1_
  - [ ] 2.2 app.config.tsにprovideServiceWorkerを追加する
    - `provideServiceWorker('ngsw-worker.js', { enabled: !isDevMode(), registrationStrategy: 'registerWhenStable:30000' })`
    - 本番環境のみSW有効、アプリ安定後に登録（30秒タイムアウト）
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - [ ] 2.3 ngsw-config.jsonを作成する
    - app-shell assetGroup: prefetchモードでindex.html、CSS、JS、favicon.ico、manifest.webmanifestを含む
    - assets assetGroup: lazyモードで画像・アセットファイルを含む
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 3. チェックポイント - ビルド確認
  - プロダクションビルドを実行し、ngsw-worker.js・manifest.webmanifestが出力されることを確認。テストが通ることを確認し、問題があればユーザーに質問する。

- [ ] 4. テストとビルド検証
  - [ ] 4.1 manifest構造のユニットテストを作成する
    - manifest.webmanifestの必須フィールド存在確認テスト
    - アイコンファイルパスの有効性検証テスト
    - _Requirements: 1.1, 1.4, 4.1, 4.2, 4.3_
  - [ ] 4.2 ngsw-config構造のユニットテストを作成する
    - app-shell assetGroupにindex.html・CSS・JSが含まれることを検証
    - installMode: "prefetch" の設定確認
    - _Requirements: 3.1, 3.2_
  - [ ] 4.3 ビルド成果物の統合テストを作成する
    - プロダクションビルド後にngsw-worker.js、manifest.webmanifest、アイコンファイルが存在することを検証
    - _Requirements: 1.2, 2.1_

- [ ] 5. 最終チェックポイント
  - すべてのテストが通ることを確認し、問題があればユーザーに質問する。

## Notes

- Angular SWはナビゲーションリクエストにプリキャッシュ済みindex.htmlを返すためoffline.htmlは不要
- SW登録失敗・非対応ブラウザ時はフレームワークが自動的にグレースフルデグラデーション
- 各タスクは特定の要件を参照しトレーサビリティを確保

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "2.2", "2.3"] },
    { "id": 2, "tasks": ["4.1", "4.2", "4.3"] }
  ]
}
```
