定期タスクの機能は、下記のように変えることを検討している。

- Template_Task の子として Instance_Task を配置するのをやめる。
- そもそもこの Template_Task 自体が一覧から見えないようにしたい。
- Template_Task 自体が子を持てるようにしたい。
- Instance_Task を生成するか否かを generation_period で判断するのではなく、単に次回のタスクだけ生成するようにする。その先のは生成しない。
- 特定の Instance_Task だけカスタマイズ（Template_Task の仕様と異なるようにする）ことを可能とし、その変更は Template_Task へは影響しないようにする。
- Instance_Task をコピーできるようにする。ただしその場合は、Instance_Task であるという情報はコピーしない。通常のタスクになるようにコピーする。

---

# Requirements Document

## Meta

- **GitHub Issue**: (未作成 - Issue作成後にURLを記載)
- **スコープ**: 定期タスクの繰り返し設定、インスタンス自動生成、生成済みインスタンスの独立性

## Introduction

nestodoにおける定期タスク機能を定義する。ユーザーが繰り返しルールを設定すると、未来の特定期間分のタスクインスタンスを一括自動生成し、各インスタンスは独立したタスクとして管理される。テンプレートと生成済みインスタンスの関係性、生成期間、繰り返しパターンを対象とする。

## Glossary

- **Recurrence_Service**: 定期タスクの設定・インスタンス生成を担うサービス層
- **Recurrence_Rule**: 繰り返しパターン（頻度・間隔・終了条件）を定義するエンティティ
- **Template_Task**: 繰り返しルールが設定された元タスク。インスタンス生成の雛形となる
- **Instance_Task**: Template_Taskから自動生成された独立タスク。通常のTaskと同等に扱われる
- **Generation_Period**: インスタンスを生成する未来の期間（デフォルト: 1ヶ月）

## Requirements

### Requirement 1: 繰り返しルールの設定

**User Story:** ユーザーとして、タスクに繰り返しルールを設定したい。定期的な作業を毎回手動で作成する手間を省くため。

#### Acceptance Criteria

1. WHEN 有効なRecurrence_Ruleが指定された場合、Recurrence_Serviceは対象タスクをTemplate_Taskとして登録し、ルールを保存すること
2. THE Recurrence_Serviceは以下の繰り返しパターンを受け付けること: daily（毎日）、weekly（毎週特定曜日）、monthly（毎月特定日）、custom（N日間隔）
3. WHEN weeklyパターンが指定された場合、Recurrence_Serviceは1つ以上の曜日指定を必須とすること
4. WHEN monthlyパターンで指定日が月の日数を超える場合、Recurrence_Serviceはその月の末日を使用すること
5. WHEN customパターンが指定された場合、Recurrence_Serviceは1以上の整数の間隔日数を必須とすること
6. IF 対象タスクにRecurrence_Ruleを設定した結果、Instance_Taskの生成により階層が10を超える場合、THEN Recurrence_Serviceはバリデーションエラーを返却すること

### Requirement 2: インスタンスの自動生成

**User Story:** ユーザーとして、繰り返し設定時に未来のタスクが自動生成されてほしい。将来の予定を一覧で確認できるようにするため。

#### Acceptance Criteria

1. WHEN Recurrence_Ruleが保存された場合、Recurrence_Serviceは本日からGeneration_Period分のInstance_Taskを一括生成すること
2. THE Recurrence_Serviceは各Instance_Taskのevent_atをRecurrence_Ruleに基づき算出すること
3. THE Recurrence_Serviceは各Instance_Taskにtask_name、task_type、priority、estimated_timeをTemplate_Taskから複製すること
4. THE Recurrence_Serviceは各Instance_Taskのstatus、progress、actual_timeをデフォルト値（incomplete、null、null）で初期化すること
5. IF インスタンス生成中にエラーが発生した場合、THEN Recurrence_Serviceは全生成をロールバックしエラーを返却すること
6. THE Recurrence_Serviceは生成したInstance_Task群をTemplate_Taskの子タスクとしてsort_order昇順（event_at順）で配置すること

### Requirement 3: 生成済みインスタンスの独立性

**User Story:** ユーザーとして、生成されたタスクを個別に編集・完了したい。各回の作業内容や進捗が異なるため。

#### Acceptance Criteria

1. THE Instance_Taskは通常のTaskと同一のCRUD操作を受け付けること
2. WHEN Instance_Taskが編集された場合、Recurrence_Serviceは他のInstance_TaskおよびTemplate_Taskに変更を伝播しないこと
3. WHEN Instance_Taskが削除された場合、Recurrence_Serviceは他のInstance_Taskに影響を与えないこと
4. WHEN Template_Taskが削除された場合、Recurrence_Serviceは生成済みの全Instance_Taskも削除すること（カスケード削除）

### Requirement 4: 繰り返しルールの変更と解除

**User Story:** ユーザーとして、繰り返しルールを変更・解除したい。予定の変更に対応するため。

#### Acceptance Criteria

1. WHEN Recurrence_Ruleが変更された場合、Recurrence_Serviceは未完了のInstance_Taskを全て削除し、新ルールで再生成すること
2. WHEN Recurrence_Ruleが変更された場合、Recurrence_Serviceは完了済みのInstance_Taskを保持すること
3. WHEN Recurrence_Ruleが解除された場合、Recurrence_Serviceはルールを削除し、生成済みInstance_Taskはそのまま残すこと
4. IF ルール変更後の再生成中にエラーが発生した場合、THEN Recurrence_Serviceは全変更をロールバックしエラーを返却すること

### Requirement 5: 生成期間の管理

**User Story:** ユーザーとして、生成期間を自由に指定したい。長期的な定期タスクも管理できるようにするため。

#### Acceptance Criteria

1. THE Recurrence_Serviceはデフォルトのgeneration_periodを1ヶ月（30日）とすること
2. WHEN ユーザーがgeneration_periodを指定した場合、Recurrence_Serviceは最大50年までの期間を受け付けること
3. IF generation_periodが50年を超える場合、THEN Recurrence_Serviceはバリデーションエラーを返却すること
