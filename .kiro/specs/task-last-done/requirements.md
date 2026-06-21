# Requirements Document

## Meta

- **バージョン**: v1.0
- **スコープ**: 最終実施日（last_done_at）の自動更新ロジック

## Introduction

nestodoのタスクにおける最終実施日（last_done_at）の自動更新ルールを定義する。進捗・作業時間の更新時および完了遷移時に、Day_Boundary（午前5時）基準の論理日付をDATE型で保存する。タスクのCRUD基本操作はtask-crud specに、ステータス連動・一括完了ロジックはtask-completion-logic specに分離している。

## Glossary

- **last_done_at**: タスクの最終実施日。DATE型で格納し、Day_Boundary基準の「本日」を使用する
- **Day_Boundary**: 午前5時を日付の切り替わり基準とする。5:00以前の操作は前日として扱う
- **tz_offset**: クライアントのタイムゾーンオフセット（分単位）。JavaScriptのgetTimezoneOffset()値
- **Completion_Trigger**: progress=100またはstatus='complete'への更新により完了遷移が発生するイベント

## Requirements

### Requirement 1: 最終実施日の自動更新

**User Story:** 開発者として、進捗または作業時間実績の更新時に最終実施日を自動更新したい。タスクの最終作業日を正確に追跡するため。

#### Acceptance Criteria

1. progressまたはactual_timeの更新リクエストにupdate_last_done=true（デフォルト値）が含まれる場合、Task_Serviceはリクエストに含まれるtz_offsetとDay_Boundary（午前5時）に基づいて論理日付を算出し、last_done_atにDATE型で保存すること
2. progressまたはactual_timeの更新リクエストにupdate_last_done=falseが含まれる場合、Task_Serviceはlast_done_atを変更しないこと。ただし、progress=100によりCompletion_Trigger（完了遷移）が発生する場合は本基準より基準6（完了遷移時のlast_done_at更新）が優先適用されること
3. progressおよびactual_time以外のフィールドのみの更新の場合、Task_Serviceはupdate_last_doneパラメータに関わらずlast_done_atを変更しないこと
4. last_done_atはDATE型（時刻なし）で格納し、Day_Boundary（午前5時）基準の「本日」を使用すること
5. last_done_atを更新するリクエスト（update_last_done=trueかつprogress/actual_time更新、または完了遷移）にはtz_offset（分単位、JSのgetTimezoneOffset()値）を必須とすること。tz_offsetが欠落または-720〜840の範囲外の場合、Task_Serviceはデータを変更せずバリデーションエラーを返却すること。なお、progress=100によるCompletion_Triggerではupdate_last_doneの値に関わらずtz_offsetが必須となる
6. 完了遷移（complete()呼び出し）が即成功する場合（未完了子孫なし、type='completed'）、Task_Serviceは対象タスクのlast_done_atをtz_offsetとDay_Boundary基準の論理日付に設定すること
7. 一括完了（confirmed=true）リクエストにはtz_offsetを必須とすること。Task_Serviceはtz_offsetとDay_Boundary基準で論理日付を算出し、対象の親タスクおよび全子孫のlast_done_atを当該日付に設定すること。tz_offsetが欠落または範囲外の場合はバリデーションエラーを返却すること
