# Spec Index

このファイルは、実装前に spec 間の依存関係・関連領域を素早く把握するための索引です。
対象 spec の詳細は、必ず `.kiro/specs/<spec名>/requirements.md`、`design.md`、`tasks.md` を参照してください。

## 読み方

- 実装対象 spec を特定したら、この索引で依存 spec・関連 spec・共通領域を確認する。
- 依存 spec がある場合は、その spec の `requirements.md` と `design.md` を読んでから実装する。
- 関連 spec がある場合は、変更箇所が関連領域に触れるときだけ、その spec の `requirements.md` と `design.md` を読む。
- 他 spec の `tasks.md` は、実装順序・未完了タスク・チェックポイント確認が必要な場合のみ読む。
- `_archived` 配下の spec は、ユーザーが明示した場合または設計経緯の確認が必要な場合のみ参照する。

## Spec 一覧

| spec | 概要 | 主な領域 | 依存 spec | 関連 spec |
|---|---|---|---|---|
| `task-management-core` | タスクCRUD、階層構造、属性管理、ステータス/進捗連動、一括完了、最終実施日管理 | FastAPI, SQLAlchemy, task API, tasks/task_contents data model | なし | `display-and-filter`, `task-detail-panel`, `batch-edit-mode`, `batch-completion-ui`, `daily-export` |
| `display-and-filter` | タスクリスト表示、ツリー構造、詳細パネル遷移、グローバルフィルター、Day_Boundary | Task list UI, FilterService, tree API, panel state | `task-management-core` | `task-detail-panel`, `batch-edit-mode`, `daily-export` |
| `task-detail-panel` | 右サイド詳細パネル、属性編集、作業時間入力、export_flag、Optimistic UI、last_done_at更新制御 | Detail panel UI, DetailSaveService, task contents editing | `task-management-core`, `display-and-filter` | `batch-completion-ui`, `pwa-offline`, `daily-export` |
| `batch-completion-ui` | 親タスク完了時の一括完了確認モーダル、Completion_TriggerのOptimistic UI例外処理、子孫UI同期 | DetailSaveService extension, completion modal, task refetch | `task-management-core`, `task-detail-panel` | `display-and-filter`, `pwa-offline` |
| `batch-edit-mode` | 一括編集モード、変更バッファ、保存/キャンセル、Undo/Redo、並び替え、フィルター解除 | EditModeService, batch update API, SortOrderCalculator, task list UI | `task-management-core`, `display-and-filter` | `task-detail-panel`, `pwa-offline` |
| `daily-export` | 日報エクスポート、本日の実績、残タスク出力 | ExportService, daily export API, text formatting | `task-management-core`, `display-and-filter` | `task-detail-panel` |
| `menu-button` | タスク一覧画面のメニューボタン、ナビゲーションパネル、将来の画面追加準備 | Header/menu UI, MenuService, routing | `display-and-filter` | `pwa-install` |
| `pwa-install` | PWA基盤、Web App Manifest、Service Worker登録、App Shellキャッシュ、アイコン | Angular PWA, manifest, ngsw-config | なし | `pwa-offline`, `menu-button` |
| `pwa-offline` | オフライン通知、HTTPエラー統一、入力保持、自動リトライ | Offline banner, HTTP interceptor, DetailSaveService pending queue | `pwa-install`, `task-detail-panel` | `batch-completion-ui`, `batch-edit-mode` |

## 共通領域

### タスクデータモデル・CRUD

- 基準 spec: `task-management-core`
- 影響しやすい spec: `display-and-filter`, `task-detail-panel`, `batch-edit-mode`, `batch-completion-ui`, `daily-export`
- 注意: `tasks` / `task_contents` のフィールド、`UpdateInput` のUNSET/null区別、Root_Taskの `event_at` 不変条件、最大10階層制限を変更する場合は関連 spec を確認する。

### ツリー表示・フィルター・詳細パネル遷移

- 基準 spec: `display-and-filter`
- 影響しやすい spec: `task-detail-panel`, `batch-edit-mode`, `menu-button`, `batch-completion-ui`
- 注意: フィルター済みツリーでは非表示の子孫が存在し得るため、完了判定や一括完了判定をフロントエンドの表示状態だけで判断しない。

### 詳細パネル保存・Optimistic UI

- 基準 spec: `task-detail-panel`
- 上書き/拡張 spec: `batch-completion-ui`, `pwa-offline`
- 注意: `Completion_Trigger`（status=完了またはprogress=100）はOptimistic UIの例外であり、`batch-completion-ui` のサーバー確認フローを優先する。

### 一括編集・一括保存

- 基準 spec: `batch-edit-mode`
- 依存 spec: `task-management-core`, `display-and-filter`
- 注意: 一括編集保存は `pwa-offline` の自動リトライ対象外。オフライン時は `batch-edit-mode` 側の既存エラーハンドリングに従う。

### 一括完了

- 基準 spec: `task-management-core`
- UI spec: `batch-completion-ui`
- 関連 spec: `task-detail-panel`, `display-and-filter`, `pwa-offline`
- 注意: 全完了経路はサーバー側の同一判定に集約する。未完了子孫の有無はDB状態を真実の源泉とする。

### Day_Boundary・last_done_at

- 基準 spec: `display-and-filter`, `task-management-core`
- 利用 spec: `daily-export`, `task-detail-panel`, `batch-completion-ui`
- 注意: Day_Boundaryはローカル時刻の午前5時。`tz_offset` はJSの `getTimezoneOffset()` 値（分単位）を使用する。

### PWA・オフライン

- 基準 spec: `pwa-install`
- 拡張 spec: `pwa-offline`
- 関連 spec: `task-detail-panel`, `batch-completion-ui`, `batch-edit-mode`
- 注意: `DetailSaveService` 経由の個別保存はオフライン自動リトライ対象。一括完了確認フローと一括編集保存は対象外。
