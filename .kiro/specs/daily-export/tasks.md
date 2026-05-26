# Implementation Plan: daily-export

## Overview

バックエンドのExportService（Python/FastAPI）とフロントエンドのExportButtonComponent（Angular）を段階的に実装する。データ収集ロジック→テキスト整形→APIエンドポイント→フロントエンドUIの順で構築し、各段階でテストを挟む。

## Tasks

- [ ] 1. ExportService コアロジック実装
  - [ ] 1.1 `collect_today_results`と`collect_remaining_tasks`を実装
    - ExportServiceクラスを作成し、FilterServiceへの依存注入を設定
    - `collect_today_results`: last_done_at=today かつ export_flag=true のフィルタリング
    - `collect_remaining_tasks`: status='incomplete' かつ export_flag=true のフィルタリング
    - 両メソッドともtask_name昇順ソートを適用
    - _Requirements: 1.1, 1.4, 2.1, 2.3, 2.4_
  - [ ]* 1.2 Property 1, 2, 3のプロパティテストを作成
    - **Property 1: Today_Results収集の正当性**
    - **Property 2: Remaining_Tasks収集の正当性**
    - **Property 3: 未完了実績タスクの重複包含**
    - hypothesisで各100回以上検証
    - **Validates: Requirements 1.1, 2.1, 2.4**
  - [ ] 1.3 `format_report`を実装
    - 3セクション構成（ヘッダー・本日の実績・残タスク）のテキスト生成
    - 完了タスクに`[完了]`マーク付与、progress表示（null時は「未設定」）
    - 空セクション時のメッセージ（「進捗変化なし」「残タスクなし」）
    - セクション間の空行区切り、ヘッダー日付YYYY-MM-DD形式
    - _Requirements: 1.2, 1.3, 2.2, 3.1, 3.2, 3.3, 3.4, 3.5_
  - [ ]* 1.4 Property 4, 5, 6のプロパティテストを作成
    - **Property 4: セクション出力の情報完全性**
    - **Property 5: ソート順の不変条件**
    - **Property 6: 出力構造とヘッダー日付**
    - **Validates: Requirements 1.2, 1.3, 1.4, 2.2, 2.3, 3.1, 3.2, 3.3**

- [ ] 2. APIエンドポイントとDB層実装
  - [ ] 2.1 ExportRepositoryとAPIエンドポイントを実装
    - `ExportRepository`: export_flag=trueのタスクをDBから非同期取得
    - `GET /api/export/daily?tz_offset=N`: tz_offsetバリデーション（-720〜840）
    - `generate_daily_report`でFilterService.get_day_boundary呼び出し→収集→整形→返却
    - PlainTextResponse（Content-Type: text/plain）で返却
    - _Requirements: 4.1, 4.2, 4.3_
  - [ ]* 2.2 APIエンドポイントのユニットテストを作成
    - 正常系（テキスト形式確認）、tz_offsetバリデーションエラー、対象0件時の空メッセージ
    - pytest + httpx使用
    - _Requirements: 4.1, 4.2, 4.3_

- [ ] 3. チェックポイント - バックエンド完了確認
  - 全テストがパスすることを確認し、不明点があればユーザーに質問する。

- [ ] 4. フロントエンド ExportButtonComponent実装
  - [ ] 4.1 ExportButtonComponentを実装
    - エクスポートボタンUI作成（Angular スタンドアロンコンポーネント）
    - `GET /api/export/daily?tz_offset=N`呼び出し（tz_offsetはブラウザのタイムゾーンから取得）
    - レスポンステキストをクリップボードにコピー、成功時SnackBar通知
    - _Requirements: 4.1, 4.2_
  - [ ]* 4.2 ExportButtonComponentのユニットテストを作成
    - ボタンクリック→API呼び出し→クリップボードコピーのフロー検証
    - _Requirements: 4.1_

- [ ] 5. 最終チェックポイント
  - 全テストがパスすることを確認し、不明点があればユーザーに質問する。

## Notes

- `*` 付きタスクはオプション（スキップ可能）
- 各タスクは対応するRequirementsを参照し追跡可能
- プロパティテストはhypothesis使用、ユニットテストはpytest使用
- 既存の`FilterService.get_day_boundary()`を再利用しDay_Boundary定義を一元管理

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["1.4", "2.1"] },
    { "id": 3, "tasks": ["2.2"] },
    { "id": 4, "tasks": ["4.1"] },
    { "id": 5, "tasks": ["4.2"] }
  ]
}
```
