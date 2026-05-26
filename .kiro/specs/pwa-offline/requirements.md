# Requirements Document

## Meta

- **GitHub Issue**: https://github.com/ky5bass/nestodo/issues/11
- **スコープ**: オフライン対応（オフライン通知、入力保持、自動リトライ）

## Introduction

PWA基盤（pwa-install spec）の上に、オフライン時のユーザー体験を向上させる機能を追加する。ネットワーク切断時にユーザーが状況を把握でき、入力済みデータが失われないことを保証する。

## Glossary

- **PWA_App**: PWAとして動作するnestodoアプリケーション全体
- **Offline_Banner**: オフライン状態をユーザーに通知する画面上部固定バナー
- **Pending_Queue**: オフライン中に蓄積された未送信リクエストのキュー
- **OfflineError**: オフライン時にHTTPインターセプターがthrowするカスタムエラー

## Requirements

### Requirement 1: オフライン状態通知

**User Story:** ユーザーとして、オフライン時にも適切なフィードバックを受けたい。アプリが壊れたと誤解しないため。

#### Acceptance Criteria

1. WHILE ネットワーク接続がない状態で、WHEN PWA_Appが表示されている場合、THE PWA_App SHALL 画面上部に固定表示されるOffline_Bannerによりオフライン状態であることをユーザーに通知すること
2. WHEN ネットワーク接続が回復した場合、THE PWA_App SHALL 3秒以内にOffline_Bannerを非表示にすること
3. IF 3秒の復帰待機中に再度ネットワーク接続が切断された場合、THEN THE PWA_App SHALL 復帰タイマーをキャンセルし、Offline_Bannerの表示を維持すること

### Requirement 2: オフライン時HTTPエラーハンドリング

**User Story:** 開発者として、オフライン時のHTTPエラーを統一的に処理したい。各コンポーネントでの個別対応を避けるため。

#### Acceptance Criteria

1. IF ネットワーク接続がない状態でHTTPリクエストがエラーになった場合、THEN THE PWA_App SHALL OfflineErrorをthrowし、呼び出し元にオフライン状態であることを通知すること
2. IF ネットワーク接続がある状態でHTTPリクエストがエラーになった場合、THEN THE PWA_App SHALL 元のエラーをそのまま再throwし、既存のエラーハンドリングに影響を与えないこと

### Requirement 3: オフライン時の入力保持と自動リトライ

**User Story:** ユーザーとして、オフライン中に編集したデータが失われないでほしい。オンライン復帰後に自動的に保存されるため。

#### Acceptance Criteria

1. IF オフライン中に`DetailSaveService`経由の`saveField`または`saveContent`が失敗した場合、THEN THE PWA_App SHALL ユーザーが入力済みのデータを画面上に保持し、Pending_Queueに追加すること
2. WHEN ネットワーク接続が回復した場合、THE PWA_App SHALL Pending_Queue内のリクエストを順次自動リトライすること
3. IF 自動リトライが失敗した場合、THEN THE PWA_App SHALL 該当フィールドをサーバー最終値にロールバックし、Snackbarで失敗を通知すること
4. IF 同一フィールドに対してオフライン中に複数回の変更があった場合、THEN THE Pending_Queue SHALL 最新の値のみを保持し、ロールバック用の初回値（previousValue）を維持すること
5. THE PWA_App SHALL 一括完了確認フロー（batch-completion-ui）および一括編集保存（batch-edit-mode）を自動リトライ対象外とし、各specの既存エラーハンドリングに従うこと
