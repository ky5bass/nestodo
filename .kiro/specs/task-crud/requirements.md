# Requirements Document

## Meta

- **バージョン**: v1.0
- **スコープ**: タスクCRUD操作、階層構造、属性管理、データ分離（tasks + task_contents）

## Introduction

nestodoのタスク管理における基本操作を定義する。タスクの作成・読み取り・更新・削除（CRUD）、最大10階層のツリー構造、およびデータ分離（tasksテーブルとtask_contentsテーブル）を対象とする。ステータス連動・一括完了ロジックはtask-completion-logic specに、最終実施日管理はtask-last-done specに分離している。

## Glossary

- **Task_Service**: タスクのCRUD操作とビジネスロジックを担うサービス層
- **Task**: メインテーブル(tasks)に格納されるタスクエンティティ
- **Task_Content**: サブテーブル(task_contents)に格納される長文データエンティティ
- **Root_Task**: 親を持たない最上位のタスク（event_at必須）
- **Child_Task**: 親タスクを持つ下位のタスク（event_at任意）
- **Priority**: タスクの優先度。none（なし）、priority（優先）、highest（最優先）の3値をとる

## Requirements

### Requirement 1: タスクの作成

**User Story:** 開発者として、新しいタスクを作成したい。タスク管理の起点となるため。

#### Acceptance Criteria

1. task_name（1〜255文字）、task_type（TODOまたはSCHEDULE）、sort_order（浮動小数点）を含む作成リクエストを受けた場合、Task_Serviceはタスクを作成し、生成されたIDを含むエンティティを返却すること
2. Root_Taskとして作成する場合、Task_Serviceはevent_atを必須とすること
3. Child_Taskとして作成する場合、Task_Serviceはevent_atをnull許容とすること
4. 任意フィールドが未指定の場合、Task_Serviceは以下のデフォルト値を設定すること: status=incomplete, progress=null, priority=none（なし）, estimated_time=null, actual_time=null, preview=null, detail_flag=false, export_flag=true, last_done_at=null
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
4. 更新フィールドに不正な値が含まれる場合（例: progressが0〜100の範囲外、priorityがnone/priority/highest以外の値）、Task_Serviceはデータを変更せずバリデーションエラーを返却すること
5. Root_Taskのevent_atをnullに更新するリクエストの場合、Task_Serviceはデータを変更せずバリデーションエラーを返却すること（Root_Task event_at必須不変条件）
6. parent_idをnullに変更してChild_TaskをRoot_Taskに昇格させる場合、同一リクエスト内でnon-nullのevent_atを指定するか、既存のevent_atがnon-nullであることを必須とすること。いずれも満たさない場合、Task_Serviceはバリデーションエラーを返却すること
7. Root_TaskをChild_Taskに降格させる場合（parent_idにnon-null値を設定）、event_atは保持されること。降格後のChild_Taskのevent_atを明示的にnullにする場合は別途更新リクエストで行うこと

### Requirement 4: タスクの削除

**User Story:** 開発者として、不要なタスクを削除したい。リストを整理するため。

#### Acceptance Criteria

1. 削除対象のタスクIDが指定された場合、Task_Serviceはそのタスクと全子孫タスクを単一のアトミック操作で削除すること
2. タスク削除時、Task_Serviceは対象および全子孫に関連するTask_Contentレコードも削除すること
3. 対象タスクが存在しない場合、Task_Serviceはデータを変更せずnot-foundエラーを返却すること
4. カスケード削除中に失敗した場合、Task_Serviceは全変更をロールバックしエラーを返却すること

### Requirement 5: データ分離

**User Story:** 開発者として、長文データを分離して管理したい。一覧取得のレスポンス性能を確保するため。

#### Acceptance Criteria

1. Task_Serviceはtask_name, status, progress, priority, sort_order, event_at, task_type, estimated_time, actual_time, preview, detail_flag, export_flag, last_done_atをtasksテーブルに格納すること
2. Task_Serviceはpre_info, notes, reflectionをtask_contentsテーブルに親Taskと1対1の関係で格納すること
3. Task_Contentが空でないnotesで作成・更新された場合、Task_Serviceはpreviewを最初の改行または100文字のいずれか短い方までのテキストに設定すること
4. notesがnullまたは空白のみの場合、Task_Serviceはpreviewを空文字列に設定すること
5. Task_Contentのいずれかのフィールドに空白以外の内容がある場合、Task_Serviceはdetail_flagをtrueに設定すること
6. Task_Contentの全フィールドがnullまたは空白のみの場合、Task_Serviceはdetail_flagをfalseに設定すること
