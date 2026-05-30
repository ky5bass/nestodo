# Requirements Document

## Meta

- **GitHub Issue**: https://github.com/ky5bass/nestodo/issues/13
- **スコープ**: PWA基盤（インストール可能化、Service Worker登録、App Shellキャッシュ、アイコン）

## Introduction

nestodoをPWA（Progressive Web App）として動作させ、ユーザーがブラウザのタブ操作なしにタスクバーやホーム画面からアプリを起動できるようにする。本specではPWAとして認識されるための基盤設定（manifest、Service Worker、キャッシュ戦略）を扱う。

## Glossary

- **PWA_App**: PWAとして動作するnestodoアプリケーション全体
- **Web_App_Manifest**: PWAのメタデータを定義するmanifest.webmanifestファイル
- **Service_Worker**: バックグラウンドで動作し、キャッシュやオフライン対応を担うスクリプト
- **App_Shell**: アプリの基本UIフレーム（ナビゲーション、レイアウト等の静的構造）

## Requirements

### Requirement 1: アプリのインストール

**User Story:** ユーザーとして、nestodoをデバイスにインストールしたい。タスクバーやホーム画面からワンクリックで起動できるようにするため。

#### Acceptance Criteria

1. THE Web_App_Manifest SHALL アプリ名（最大45文字）、短縮名（最大12文字）、アイコン（192x192および512x512）、表示モード（standalone）、テーマカラー、背景色を定義すること
2. WHEN ユーザーがPWA_Appにアクセスした場合、THE PWA_App SHALL HTTPS経由で提供され、有効なWeb_App_Manifestがリンクされ、Service_Workerが登録済みであることにより、ブラウザのインストールプロンプト表示条件を満たすこと
3. WHEN PWA_Appがインストールされた場合、THE PWA_App SHALL ブラウザのアドレスバーなしのスタンドアロンウィンドウで起動すること
4. THE Web_App_Manifest SHALL start_urlとしてアプリのルートパスを指定すること
5. THE PWA_App SHALL HTMLドキュメントのhead要素内にWeb_App_Manifestへのlink要素（rel="manifest"）を含むこと

### Requirement 2: Service Workerの登録

**User Story:** 開発者として、Service Workerを登録したい。キャッシュ制御とオフライン対応の基盤を確保するため。

#### Acceptance Criteria

1. WHEN PWA_Appのページロードが完了した場合、THE PWA_App SHALL Service_Workerをアプリのルートスコープで登録すること
2. IF Service_Workerの登録に失敗した場合、THEN THE PWA_App SHALL エラーをコンソールに記録し、Service_Worker未登録の状態でアプリの全画面遷移・表示機能を維持すること
3. WHEN 新しいService_Workerが検出された場合、THE PWA_App SHALL 現在のService_Workerのコントロール下にあるすべてのタブが閉じられた後の次回ページロード時に新バージョンを有効化すること
4. IF ブラウザがService Worker APIをサポートしていない場合、THEN THE PWA_App SHALL 登録処理をスキップし、Service_Worker未登録の状態でアプリの全画面遷移・表示機能を維持すること

### Requirement 3: App Shellキャッシュ

**User Story:** ユーザーとして、アプリの基本画面が素早く表示されてほしい。起動時の待ち時間を最小限にするため。

#### Acceptance Criteria

1. WHEN Service_Workerがインストールされた場合、THE Service_Worker SHALL App_Shell（HTML、CSS、JavaScript）をキャッシュストレージに保存し、すべてのリソースの保存が完了するまでインストールを完了しないこと（本アプリはシステムフォントのみ使用し、カスタムフォントファイルは含まない）
2. WHEN キャッシュ済みのApp_Shellリソースがリクエストされた場合、THE Service_Worker SHALL ネットワークリクエストより先にキャッシュから応答すること（Cache First戦略）
3. WHEN オフライン状態でナビゲーションリクエストが発生した場合、THE Service_Worker SHALL プリキャッシュ済みのindex.html（App Shell）を応答し、アプリのUI構造を表示すること
4. IF App_Shellリソースのキャッシュ保存に失敗した場合、THEN THE Service_Worker SHALL インストールを中断し、次回アクセス時に再度インストールを試行すること

### Requirement 4: アプリアイコンとスプラッシュ画面

**User Story:** ユーザーとして、アプリらしい見た目で起動してほしい。ネイティブアプリと同等の体験を得るため。

#### Acceptance Criteria

1. THE Web_App_Manifest SHALL 192x192（purpose: "any"、ホーム画面用）と512x512（purpose: "any"、スプラッシュ画面用）のPNGアイコンを含み、各アイコンのsrcパスが有効なリソースを指していること
2. THE Web_App_Manifest SHALL 512x512のPNGアイコンをpurpose: "maskable"として含み、アイコンの重要なコンテンツが中心80%の領域内に収まっていること
3. THE Web_App_Manifest SHALL スプラッシュ画面生成に必要なフィールド（name、icons（512x512以上）、background_color、theme_color）をすべて定義すること
4. WHEN PWA_Appがスタンドアロンモードで起動された場合、THE Web_App_Manifest SHALL 対応環境でスプラッシュ画面が自動生成される条件（name、512x512以上のアイコン、background_color）を満たしていること
