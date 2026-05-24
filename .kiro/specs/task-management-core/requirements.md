# Requirements Document

## Meta

- **GitHub Issue**: (未作成 - Issue作成後にURLを記載)
- **スコープ**: タスクCRUD、階層構造、属性管理、ステータス連動、一括完了

## Introduction

nestodoのコア機能であるタスク管理の基盤を定義する。タスクのCRUD操作、最大10階層のツリー構造、ステータス/進捗の連動ロジック、一括完了処理、およびデータ分離（tasks + task_contents）を対象とする。

> **注記**: 定期タスク（繰り返しタスクの自動生成）は初回リリースでは保留とする。検討経緯は `.kiro/specs/_archived/recurring-tasks/` を参照。

## Glossary

- **Task_Service**: タスクのCRUD操作とビジネスロジックを担うサービス層
- **Task**: メインテーブル(tasks)に格納されるタスクエンティティ
- **Task_Content**: サブテーブル(task_contents)に格納される長文データエンティティ
- **Root_Task**: 親を持たない最上位のタスク（event_at必須）
- **Child_Task**: 親タスクを持つ下位のタスク（event_at任意）

## Requirements

### Requirement 1: タスクの作成

**User Story:** 開発者として、新しいタスクを作成したい。タスク管理の起点となるため。

#### Acceptance Criteria

1. task_name（1〜255文字）、task_type（TODOまたはSCHEDULE）、sort_order（浮動小数点）を含む作成リクエストを受けた場合、Task_Serviceはタスクを作成し、生成されたIDを含むエンティティを返却すること
2. Root_Taskとして作成する場合、Task_Serviceはevent_atを必須とすること
3. Child_Taskとして作成する場合、Task_Serviceはevent_atをnull許容とすること
4. 任意フィールドが未指定の場合、Task_Serviceは以下のデフォルト値を設定すること: status=incomplete, progress=null, priority=none, estimated_time=null, actual_time=null, preview=null, detail_flag=false, export_flag=true
5. 必須フィールド（task_name, task_type, sort_order）が欠落または不正な場合、Task_Serviceはバリデーションエラーを返却すること
6. 指定された親タスクが存在しない場合、Task_Serviceはnot-foundエラーを返却すること
7. Child_Taskの追加により階層が10を超える場合、Task_Serviceは階層制限エラーを返却すること

### Requirement 2: タスクの読み取り

**User Story:** 開発者として、タスクをツリー構造で取得したい。階層関係を把握するため。

#### Acceptance Criteria

1. タスクIDが指定された場合、Task_Serviceはそのタスクと直下の子タスクをsort_order昇順で返却すること
2. ルートタスク一覧がリクエストされた場合、Task_Serviceは全ルートタスクとその子孫を再帰的にツリー構造で返却すること（各階層はsort_order昇順）
3. task_contentsが明示的にリクエストされた場合、Task_Serviceは関連するTask_Contentを別フィールドで返却すること
4. 指定されたタスクIDが存在しない場合、Task_Serviceはnot-foundエラーを返却すること
5. タスクにTask_Contentが存在しない場合、Task_Serviceはtask_contentsフィールドにnullを返却すること

### Requirement 3: タスクの更新

**User Story:** 開発者として、タスクの属性を更新したい。進捗や状態を管理するため。

#### Acceptance Criteria

1. 有効な更新フィールドが指定された場合、Task_Serviceは指定されたフィールドのみを更新すること（部分更新）
2. sort_orderの更新時、Task_Serviceは兄弟間の位置決めのために浮動小数点値を受け付けること
3. 対象タスクが存在しない場合、Task_Serviceはnot-foundエラーを返却すること
4. 更新フィールドに不正な値が含まれる場合（例: progressが0〜100の範囲外、不正なpriority）、Task_Serviceはデータを変更せずバリデーションエラーを返却すること

### Requirement 4: タスクの削除

**User Story:** 開発者として、不要なタスクを削除したい。リストを整理するため。

#### Acceptance Criteria

1. 削除対象のタスクIDが指定された場合、Task_Serviceはそのタスクと全子孫タスクを単一のアトミック操作で削除すること
2. タスク削除時、Task_Serviceは対象および全子孫に関連するTask_Contentレコードも削除すること
3. 対象タスクが存在しない場合、Task_Serviceはデータを変更せずnot-foundエラーを返却すること
4. カスケード削除中に失敗した場合、Task_Serviceは全変更をロールバックしエラーを返却すること

### Requirement 5: ステータス連動ロジック

**User Story:** 開発者として、進捗とステータスが自動連動してほしい。手動の二重管理を避けるため。

#### Acceptance Criteria

1. 進捗が100に更新された場合（null含む以前の値に関わらず）、Task_Serviceは自動的にステータスを「完了」に設定すること
2. ステータスを「完了」から「未完了」に戻す場合、Task_Serviceは同一操作内で進捗を100未満に設定することを必須とすること
3. 進捗100未満の値なしにステータス戻しがリクエストされた場合、Task_Serviceは部分更新を適用せずバリデーションエラーを返却すること

### Requirement 6: 一括完了ロジック

**User Story:** 開発者として、親タスク完了時に子孫も一括完了したい。操作の手間を減らすため。

#### Acceptance Criteria

1. 未完了の子孫を持つ親タスクを完了にする場合、Task_Serviceは未完了子孫のタスクIDとステータスを含む確認要求レスポンスを返却すること
2. 未完了の子孫がない親タスクを完了にする場合、Task_Serviceは確認なしで完了処理を実行すること
3. 一括完了が確認された場合、Task_Serviceは親と全子孫のステータスを「完了」、進捗を100に深さ優先順で設定すること
4. 一括完了中にいずれかの子孫の更新が失敗した場合、Task_Serviceは全変更をロールバックしエラーを返却すること

### Requirement 7: データ分離

**User Story:** 開発者として、長文データを分離して管理したい。一覧取得のレスポンス性能を確保するため。

#### Acceptance Criteria

1. Task_Serviceはtask_name, status, progress, priority, sort_order, event_at, task_type, estimated_time, actual_time, preview, detail_flag, export_flagをtasksテーブルに格納すること
2. Task_Serviceはpre_info, notes, reflectionをtask_contentsテーブルに親Taskと1対1の関係で格納すること
3. Task_Contentが空でないnotesで作成・更新された場合、Task_Serviceはpreviewを最初の改行または100文字のいずれか短い方までのテキストに設定すること
4. notesがnullまたは空白のみの場合、Task_Serviceはpreviewを空文字列に設定すること
5. Task_Contentのいずれかのフィールドに空白以外の内容がある場合、Task_Serviceはdetail_flagをtrueに設定すること
6. Task_Contentの全フィールドがnullまたは空白のみの場合、Task_Serviceはdetail_flagをfalseに設定すること
