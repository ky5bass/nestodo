# Implementation Plan: オフライン対応

## Overview

オフライン通知バナー、HTTPインターセプター、DetailSaveServiceのpendingキュー拡張の3コンポーネントを段階的に実装する。

## Tasks

- [ ] 1. OfflineBannerComponent の実装
  - [ ] 1.1 `OfflineBannerComponent` を作成
    - standalone component として実装
    - Angular Signals (`signal`) で `isOffline` 状態を管理
    - `online`/`offline` イベントリスナーを登録
    - 3秒遅延タイマーによるバナー非表示制御
    - 再オフライン時のタイマーキャンセル処理
    - `ngOnDestroy` でリスナー・タイマーのクリーンアップ
    - `role="alert"` でアクセシビリティ対応
    - _Requirements: 1.1, 1.2, 1.3_

  - [ ] 1.2 `AppComponent` に `OfflineBannerComponent` を配置
    - テンプレートにバナーを追加
    - _Requirements: 1.1_

  - [ ]* 1.3 `OfflineBannerComponent` のユニットテスト作成
    - オフライン時にバナー表示されること
    - オンライン復帰後3秒でバナー非表示になること
    - 3秒以内に再オフラインでタイマーキャンセル・バナー維持されること
    - _Requirements: 1.1, 1.2, 1.3_

- [ ] 2. offlineInterceptor の実装
  - [ ] 2.1 `OfflineError` クラスを作成
    - `url` プロパティを持つカスタムエラークラス
    - _Requirements: 2.1_

  - [ ] 2.2 `offlineInterceptor` を作成
    - `HttpInterceptorFn` として実装
    - オフライン時は `OfflineError` をthrow
    - オンライン時は元エラーをそのまま再throw
    - _Requirements: 2.1, 2.2_

  - [ ] 2.3 `appConfig` にインターセプターを登録
    - `provideHttpClient(withInterceptors([offlineInterceptor]))` を追加
    - _Requirements: 2.1, 2.2_

  - [ ]* 2.4 `offlineInterceptor` のユニットテスト作成
    - オフライン時に `OfflineError` がthrowされること
    - オンライン時に元エラーがそのまま再throwされること
    - _Requirements: 2.1, 2.2_

- [ ] 3. チェックポイント
  - すべてのテストが通ることを確認し、不明点があればユーザーに質問する。

- [ ] 4. DetailSaveService pendingキュー拡張
  - [ ] 4.1 `PendingItem` インターフェースと pendingQueue を追加
    - `Map<string, PendingItem>` をサービスに追加
    - キー形式: `${taskId}:field:${field}` / `${taskId}:content:${field}`
    - _Requirements: 3.1, 3.4_

  - [ ] 4.2 `saveField`/`saveContent` のエラーハンドリング拡張
    - `OfflineError` 時にpendingキューへ追加（UIロールバックなし）
    - 同一キーは最新値で上書き、`previousValue` は初回値を維持
    - batch系（Completion_Trigger経路含む）は対象外
    - _Requirements: 3.1, 3.4, 3.5_

  - [ ] 4.3 オンライン復帰時の自動リトライ処理を実装
    - `online` イベントでpendingキューを順次リトライ
    - 成功時はキューから削除
    - 失敗時は `previousValue` でロールバック＋Snackbar通知
    - _Requirements: 3.2, 3.3_

  - [ ]* 4.4 pendingキュー関連のユニットテスト作成
    - オフライン時にキューに追加されること
    - 同一フィールドの上書きで `previousValue` が維持されること
    - リトライ成功時にキューから削除されること
    - リトライ失敗時にロールバック＋Snackbar通知されること
    - batch系が対象外であること
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 5. 最終チェックポイント
  - すべてのテストが通ることを確認し、不明点があればユーザーに質問する。

## Notes

- `*` 付きタスクはオプション（スキップ可能）
- 各タスクは対応する要件番号を参照
- PBTは適用しない（ユニットテストで網羅）
- DB変更なし、メモリ上のMapで管理

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1"] },
    { "id": 1, "tasks": ["1.2", "2.2"] },
    { "id": 2, "tasks": ["1.3", "2.3"] },
    { "id": 3, "tasks": ["2.4", "4.1"] },
    { "id": 4, "tasks": ["4.2"] },
    { "id": 5, "tasks": ["4.3"] },
    { "id": 6, "tasks": ["4.4"] }
  ]
}
```
