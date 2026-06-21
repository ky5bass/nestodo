# Requirements Document

## Meta

- **スコープ**: 日報エクスポート（本日の実績・残タスク出力）

## Introduction

nestodoの日報エクスポート機能を定義する。ユーザーが1日の作業実績と残タスクをテキスト形式で出力し、日々の記録を共有できるようにする。Day_Boundary（午前5時）を基準に「本日」を判定し、export_flagが有効なタスクのみを対象とする。本日の実績はlast_done_atが当日であるタスクを収集することで検出する。

## Glossary

- **Export_Service**: 日報エクスポートのデータ収集・テキスト生成を担うサービス層
- **Today_Results**: 当日（Day_Boundary基準）に作業実績があったタスクの一覧セクション
- **Remaining_Tasks**: 未完了かつexport_flag有効なタスクの一覧セクション
- **Day_Boundary**: 日付の切り替わり時刻（午前5時）。display-and-filterで定義済み
- **last_done_at**: タスクの最終実施日。task-last-doneで定義済み

## Requirements

### Requirement 1: 本日の実績セクション生成

**User Story:** ユーザーとして、本日作業したタスクの一覧を確認したい。1日の成果を把握するため。

#### Acceptance Criteria

1. WHEN エクスポートが実行された場合、Export_Serviceはlast_done_atがDay_Boundary基準の当日と一致し、かつexport_flagがtrueのタスクをToday_Resultsとして収集すること
2. THE Export_Serviceは各Today_Resultsタスクについて、task_name、progress（現在値）、statusを出力すること
3. WHEN タスクのstatusが「完了」の場合、Export_Serviceは出力に完了であることを明示すること
4. THE Export_ServiceはToday_Resultsをtask_name昇順で並べること

### Requirement 2: 残タスクセクション生成

**User Story:** ユーザーとして、未完了の対象タスク一覧を確認したい。翌日以降の作業計画に活用するため。

#### Acceptance Criteria

1. WHEN エクスポートが実行された場合、Export_Serviceはstatusが「未完了」かつexport_flagがtrueのタスクをRemaining_Tasksとして収集すること
2. THE Export_Serviceは各Remaining_Tasksタスクについて、task_name、progress（nullの場合は「未設定」）を出力すること
3. THE Export_ServiceはRemaining_Tasksをtask_name昇順で並べること
4. THE Export_ServiceはToday_Resultsに含まれる未完了タスクをRemaining_Tasksにも重複して含めること

### Requirement 3: テキスト出力フォーマット

**User Story:** ユーザーとして、日報を読みやすいテキスト形式で取得したい。そのまま共有・保存できるようにするため。

#### Acceptance Criteria

1. THE Export_Serviceは出力テキストを「日報ヘッダー（日付）」「本日の実績」「残タスク」の3セクション構成で生成すること
2. THE Export_Serviceはヘッダーに対象日付（Day_Boundary基準）をYYYY-MM-DD形式で含めること
3. THE Export_Serviceは各セクションを空行で区切ること
4. IF Today_Resultsが空の場合、THEN Export_Serviceは「本日の実績」セクションに「進捗変化なし」と出力すること
5. IF Remaining_Tasksが空の場合、THEN Export_Serviceは「残タスク」セクションに「残タスクなし」と出力すること

### Requirement 4: エクスポート実行

**User Story:** ユーザーとして、任意のタイミングで日報を生成したい。作業終了時に1日の記録を出力するため。

#### Acceptance Criteria

1. WHEN ユーザーがエクスポートを実行した場合、Export_Serviceは当日（Day_Boundary基準）のデータを収集しテキストを生成すること
2. THE Export_Serviceは生成したテキストをレスポンスとして返却すること
3. IF エクスポート対象タスク（export_flag=true）が1件も存在しない場合、THEN Export_Serviceはヘッダーと空セクションメッセージのみを返却すること
