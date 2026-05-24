# Requirements Document

## Meta

- **GitHub Issue**: (未作成 - Issue作成後にURLを記載)
- **スコープ**: タスクリスト表示（ツリー構造・プレビュー）、詳細パネル遷移、グローバルフィルター、日付境界

## Introduction

nestodoのタスクリスト画面における表示とフィルタリング機能を定義する。ツリー構造でのタスク表示、ノートプレビューの表示、通常モードでのクリックによる詳細パネル遷移、およびサーバーサイドのグローバルフィルター（effective_at算出、表示条件判定、先祖包含）を対象とする。

## Glossary

- **Task_List_View**: タスクをツリー構造で表示するUIコンポーネント
- **Filter_Service**: サーバーサイドでフィルター条件を評価し表示対象タスクを決定するサービス
- **effective_at**: フィルター判定に用いる期限値。自身のevent_atがnullの場合、親のevent_atを再帰的に参照して決定する
- **Day_Boundary**: 日付の切り替わり時刻（午前5時）

## Requirements

### Requirement 1: タスクリスト表示

**User Story:** ユーザーとして、タスクをツリー構造で閲覧し、ノートの概要を確認したい。全体像を素早く把握するため。

#### Acceptance Criteria

1. Task_List_Viewは、タスクを親子関係を反映したツリー構造で描画し、子タスクは親の下にインデントして表示すること
2. Task_List_Viewは、各タスク名の下にプレビューテキストを小さいフォントサイズで表示すること
3. プレビューテキストがnullまたは空の場合、Task_List_Viewはタスク名のみを表示し、プレビュー用の余白を設けないこと
4. Task_List_Viewは、各階層内の兄弟タスクをsort_orderの昇順で並べること

### Requirement 2: タスク詳細パネル遷移

**User Story:** ユーザーとして、タスクをクリックして詳細パネルを開きたい。全属性を確認・編集するため。

#### Acceptance Criteria

1. 通常モードでタスクがクリックされた場合、Task_List_Viewはクリックされたタスクの詳細パネルを開くこと
2. 別のタスクの詳細パネルが開いている状態で新しいタスクがクリックされた場合、Task_List_Viewは詳細パネルの表示を新しいタスクに切り替えること
3. 詳細パネルが開いているタスクと同じタスクがクリックされた場合、Task_List_Viewは詳細パネルを閉じること

### Requirement 3: グローバルフィルター - effective_at算出

**User Story:** 開発者として、タスクのフィルター判定用期限を正確に算出したい。子タスクが親の期限を継承してフィルターされるため。

#### Acceptance Criteria

1. タスク自身のevent_atがnullでない場合、Filter_Serviceはそのevent_atをeffective_atとして使用すること
2. タスク自身のevent_atがnullの場合、Filter_Serviceは祖先を再帰的に辿り、最初に見つかったnullでないevent_atをeffective_atとして使用すること
3. タスク自身および全祖先のevent_atがnullの場合、Filter_Serviceはそのタスクのeffective_atをnullとして扱うこと
4. Filter_Serviceはeffective_at算出時に、格納されているevent_atの値を一切変更しないこと

### Requirement 4: グローバルフィルター - 表示条件判定

**User Story:** ユーザーとして、直近のタスクと本日完了したタスクだけを見たい。情報過多を防ぎ集中するため。

#### Acceptance Criteria

1. タスクの状態が「未完了」かつeffective_atが本日+1ヶ月以前（effective_at <= 本日 + 1ヶ月）の場合、Filter_Serviceはそのタスクを表示対象に含めること。下限は設けず、期限切れ（過去日）の未完了タスクも表示対象とする
2. タスクが当日（Day_Boundary の午前5時以降）に完了された場合、Filter_Serviceはそのタスクを表示対象に含めること
3. タスクのeffective_atがnullかつ状態が「未完了」の場合、Filter_Serviceはそのタスクを表示対象から除外すること
4. Filter_Serviceは全てのフィルター条件をサーバーサイドで評価し、結果をクライアントに返却すること

### Requirement 5: グローバルフィルター - 先祖包含

**User Story:** ユーザーとして、表示対象タスクの親階層も見たい。ツリー構造のコンテキストを維持するため。

#### Acceptance Criteria

1. あるタスクの子孫に表示条件を満たすタスクが存在する場合、Filter_Serviceはそのタスク自身の条件合致に関わらず表示対象に含めること
2. タスク自身が表示条件を満たさず、かつ子孫にも表示条件を満たすタスクがない場合、Filter_Serviceはそのタスクを表示対象から除外すること
3. 表示条件を満たすタスクについて、Filter_Serviceはルートまでの全祖先を表示対象に含めること

### Requirement 6: 日付境界

**User Story:** 開発者として、日付の切り替わりを午前5時に設定したい。深夜作業が当日の実績として扱われるため。

#### Acceptance Criteria

1. Filter_ServiceはDay_Boundaryをローカル時刻の午前5時と定義すること
2. フィルター条件における「当日」の評価時、Filter_Serviceは本日の午前5時から翌日の午前4時59分までを1日として扱うこと
3. 午前4時30分に完了されたタスクについて、Filter_Serviceはその完了を前日（直前の午前5時に開始した日）に属するものとして扱うこと
