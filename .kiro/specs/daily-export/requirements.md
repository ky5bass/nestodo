# Requirements Document

## Meta

- **GitHub Issue**: (未作成 - Issue作成後にURLを記載)
- **スコープ**: 日報エクスポート（本日の実績・残タスク出力、進捗履歴記録）

## Introduction

nestodoの日報エクスポート機能を定義する。ユーザーが1日の作業実績と残タスクをテキスト形式で出力し、日々の物語を記録・共有できるようにする。Day_Boundary（午前5時）を基準に「本日」を判定し、export_flagが有効なタスクのみを対象とする。進捗変化の検出には、毎日の初回更新前に記録するスナップショットを使用する。

## Glossary

- **Export_Service**: 日報エクスポートのデータ収集・テキスト生成を担うサービス層
- **Progress_History**: 毎日の初回更新前に記録される進捗スナップショット（old_value / new_valueをJSON型で保持）
- **Today_Results**: 当日（Day_Boundary基準）に進捗変化があったタスクの一覧セクション
- **Remaining_Tasks**: 未完了かつexport_flag有効なタスクの一覧セクション
- **Day_Boundary**: 日付の切り替わり時刻（午前5時）。display-and-filterで定義済み

## Requirements

### Requirement 1: 進捗スナップショットの記録

**User Story:** 開発者として、毎日の初回更新前に進捗状態を記録したい。日報で進捗変化を正確に検出するため。

#### Acceptance Criteria

1. WHEN 当日（Day_Boundary基準）の最初のタスク更新リクエストを受けた場合、Export_Serviceは更新適用前に対象タスクの現在のprogressをProgress_Historyのold_valueとして記録すること
2. WHEN 同一タスクに対して当日2回目以降の更新が行われた場合、Export_Serviceはold_valueを上書きせず保持し、new_valueのみを最新値で更新すること
3. THE Export_ServiceはProgress_Historyをold_value（当日初回更新前の値・固定）とnew_value（当日の最新値・都度更新）のペアとしてJSON型で保存すること
4. WHEN statusが「完了」に変更された場合、Export_Serviceはprogressの変化と同様にstatus変更もProgress_Historyに記録すること

### Requirement 2: 本日の実績セクション生成

**User Story:** ユーザーとして、本日進捗が変化したタスクの一覧を確認したい。1日の成果を把握するため。

#### Acceptance Criteria

1. WHEN エクスポートが実行された場合、Export_ServiceはDay_Boundary基準の当日にProgress_Historyが存在し、かつexport_flagがtrueのタスクをToday_Resultsとして収集すること
2. THE Export_Serviceは各Today_Resultsタスクについて、task_name、old_value、new_value（progress）を出力すること
3. WHEN タスクが当日完了された場合、Export_Serviceはステータス変化（未完了→完了）を出力に含めること
4. THE Export_ServiceはToday_Resultsをevent_atの昇順で並べること

### Requirement 3: 残タスクセクション生成

**User Story:** ユーザーとして、未完了の対象タスク一覧を確認したい。翌日以降の作業計画に活用するため。

#### Acceptance Criteria

1. WHEN エクスポートが実行された場合、Export_Serviceはstatusが「未完了」かつexport_flagがtrueのタスクをRemaining_Tasksとして収集すること
2. THE Export_Serviceは各Remaining_Tasksタスクについて、task_name、progress（nullの場合は「未設定」）、event_atを出力すること
3. THE Export_ServiceはRemaining_Tasksをevent_atの昇順（nullは末尾）で並べること
4. THE Export_ServiceはToday_Resultsに含まれる未完了タスクをRemaining_Tasksにも重複して含めること

### Requirement 4: テキスト出力フォーマット

**User Story:** ユーザーとして、日報を読みやすいテキスト形式で取得したい。そのまま共有・保存できるようにするため。

#### Acceptance Criteria

1. THE Export_Serviceは出力テキストを「日報ヘッダー（日付）」「本日の実績」「残タスク」の3セクション構成で生成すること
2. THE Export_Serviceはヘッダーに対象日付（Day_Boundary基準）をYYYY-MM-DD形式で含めること
3. THE Export_Serviceは各セクションを空行で区切ること
4. IF Today_Resultsが空の場合、THEN Export_Serviceは「本日の実績」セクションに「進捗変化なし」と出力すること
5. IF Remaining_Tasksが空の場合、THEN Export_Serviceは「残タスク」セクションに「残タスクなし」と出力すること

### Requirement 5: エクスポート実行

**User Story:** ユーザーとして、任意のタイミングで日報を生成したい。作業終了時に1日の記録を出力するため。

#### Acceptance Criteria

1. WHEN ユーザーがエクスポートを実行した場合、Export_Serviceは当日（Day_Boundary基準）のデータを収集しテキストを生成すること
2. THE Export_Serviceは生成したテキストをレスポンスとして返却すること
3. IF エクスポート対象タスク（export_flag=true）が1件も存在しない場合、THEN Export_Serviceはヘッダーと空セクションメッセージのみを返却すること
