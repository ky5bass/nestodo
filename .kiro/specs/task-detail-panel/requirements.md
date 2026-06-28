# Requirements Document

**バージョン: v1.1**

## Meta

- **スコープ**: タスク詳細パネルのレイアウト、属性編集UI（ラジオボタン・カレンダーピッカー・トグルスイッチ・セグメントコントロール・進捗スライダー）、ステータス戻しUI、作業時間入力、エクスポートフラグ、Optimistic UI、最終実施日表示・更新制御

## Introduction

タスク詳細パネルにおける属性表示・編集機能を定義する。各属性の操作性を高めたUIコンポーネント（ラジオボタン・カレンダーピッカー・トグルスイッチ・セグメントコントロール・連続値スライダー）、ステータス戻しモーダル、作業時間入力、エクスポートフラグ、Optimistic UI保存を対象とする。パネルの開閉・切り替えナビゲーションはdisplay-and-filterで定義済み。

## Glossary

- **Detail_Panel**: タスクの全属性を表示・編集する右サイドパネルUIコンポーネント
- **Time_Input**: 分・時間・日の各単位でスライダーとテキストボックスを連動させる入力コンポーネント
- **Calendar_Picker**: 日付選択カレンダーとショートカットボタンを備えたピッカーコンポーネント
- **Time_Picker**: 5分刻みで時刻を選択するピッカーコンポーネント（時間・分は端で止まりループしない）
- **Revert_Modal**: 完了→未完了へのステータス戻し時に警告と進捗入力を求めるモーダル
- **Detail_Save_Service**: 詳細パネルからの個別保存をOptimistic UIで処理するサービス
- **Update_Last_Done_Checkbox**: 「本日の実績として更新する」チェックボックスUIコンポーネント

## Requirements

### Requirement 1: 属性表示

**User Story:** ユーザーとして、詳細パネルでタスクの全属性を一覧したい。タスクの全体像を把握するため。

#### Acceptance Criteria

1. タスクが選択された場合、Detail_Panelはtask_name, task_type, event_at, status, progress, priority, estimated_time, actual_time, export_flag, last_done_atを表示すること
2. Detail_Panelはtask_contentsテーブルからpre_info, notes, reflectionを取得し表示すること
3. pre_info, notes, reflectionがnullの場合、Detail_Panelは空の編集可能エリアを表示すること
4. Detail_Panelは、task_typeがTODOの場合はevent_atのラベルを「期限」、task_typeがSCHEDULEの場合は「開始日時」として表示すること

### Requirement 2: 属性のインライン編集

**User Story:** ユーザーとして、詳細パネルで各属性を直接編集したい。一括編集モードに切り替えずに即座に変更するため。

#### Acceptance Criteria

1. Detail_Panelでの属性編集は一括編集モードの状態に関わらず独立して動作すること。ただし、一括編集モード中はtask_nameフィールドを読み取り専用とし編集を受け付けないこと
2. task_name, task_type, event_at, progress, priority, estimated_time, actual_timeの各フィールドが編集された場合、Detail_Panelは個別にDetail_Save_Serviceへ保存リクエストを送信すること
3. last_done_atフィールドは読み取り専用で表示し、Detail_Panelは直接編集を受け付けないこと
4. task_typeが変更された場合、Detail_Panelはevent_atのラベルを即座に切り替えること（TODO→「期限」、SCHEDULE→「開始日時」）
5. pre_info, notes, reflectionが編集された場合、Detail_Panelはtask_contentsテーブルへの保存リクエストを送信すること
6. progressに0〜100の範囲外の値が入力された場合、Detail_Panelはバリデーションエラーを表示し保存を実行しないこと

### Requirement 3: ステータス完了操作

**User Story:** ユーザーとして、詳細パネルからタスクを直接完了にしたい。進捗を手動で100にする手間を省くため。

#### Acceptance Criteria

1. 未完了→完了の切り替え時（トグルスイッチまたはprogress=100到達）、Detail_Save_Serviceはstatusを完了に、progressを100に同時更新すること
2. progressが100に設定された場合（スライダー操作・トグルスイッチいずれでも）、statusは自動的に完了となること

### Requirement 4: ステータス戻しUI

**User Story:** ユーザーとして、完了タスクを未完了に戻す際に警告を受けたい。意図しない操作を防ぐため。

#### Acceptance Criteria

1. 完了状態のタスクで未完了への変更が要求された場合、Detail_PanelはRevert_Modalを表示すること
2. Revert_Modalは警告メッセージと進捗入力フィールド（0〜99の範囲）を表示すること
3. Revert_Modalで有効な進捗値が入力され確定された場合、Detail_Save_Serviceはステータスを未完了、進捗を入力値に更新すること
4. Revert_Modalでキャンセルされた場合、Detail_Panelはステータスを完了のまま維持すること

### Requirement 5: 作業時間入力UI

**User Story:** ユーザーとして、作業時間をスライダーまたは直接入力で設定したい。素早く正確に時間を記録するため。

#### Acceptance Criteria

1. Time_Inputは分・時間・日の各単位ごとにスライダーとテキストボックスを表示すること
2. 分のスライダーは5, 10, 15, 20, 30, 45の離散値を持つこと
3. 時間のスライダーは1, 2, 3, 4, 6の離散値を持つこと
4. 日のスライダーは1, 2, 3, 4, 5, 7, 10, 15, 20の離散値を持つこと
5. スライダーの値が変更された場合、Time_Inputは対応するテキストボックスの値を同期すること
6. テキストボックスに自然数が入力された場合、Time_Inputはスライダーを最も近い離散値に移動すること
7. テキストボックスに0以下または非整数が入力された場合、Time_Inputはバリデーションエラーを表示すること
8. Time_Inputはestimated_timeとactual_timeの両方に使用されること

### Requirement 6: エクスポートフラグ切り替え

**User Story:** ユーザーとして、日報出力対象を目のアイコンで切り替えたい。直感的にエクスポート対象を管理するため。

#### Acceptance Criteria

1. Detail_Panelはexport_flagの状態を目のアイコンで表示し、trueの場合は開いた目、falseの場合は閉じた目のアイコンを表示すること
2. 目のアイコンがクリックされた場合、Detail_Panelはexport_flagのtrue/falseを切り替え、Detail_Save_Serviceへ保存リクエストを送信すること

### Requirement 7: Optimistic UI保存

**User Story:** ユーザーとして、編集結果が即座にUIに反映されてほしい。待ち時間なく作業を続けるため。

#### Acceptance Criteria

1. Detail_Save_Serviceは保存リクエスト送信前にUIを更新後の値で即座に反映すること
2. サーバーからエラーレスポンスが返却された場合、Detail_Save_ServiceはUIを変更前の値にロールバックし、リトライオプション付きのエラー通知を表示すること
3. リトライが選択された場合、Detail_Save_Serviceは同一の保存リクエストを再送信すること
4. 同一フィールドに対する連続した編集が発生した場合、Detail_Save_Serviceは最新の値のみをサーバーに送信すること（デバウンス処理）

### Requirement 8: 最終実施日の更新制御UI

**User Story:** ユーザーとして、進捗や作業時間を更新する際に最終実施日を更新するかどうかを選択したい。過去実績の訂正時に最終実施日が変わるのを防ぐため。

#### Acceptance Criteria

1. Detail_Panelでprogressまたはactual_timeを編集する際、Update_Last_Done_Checkbox（「本日の実績として更新する」チェックボックス）を表示すること
2. Update_Last_Done_Checkboxのデフォルト値はtrue（チェック済み）とすること
3. Update_Last_Done_Checkboxがtrueの場合、Detail_Save_Serviceはupdate_last_done=trueおよびtz_offset（JSのgetTimezoneOffset()値、分単位）を保存リクエストに含めること
4. Update_Last_Done_Checkboxがfalseの場合、Detail_Save_Serviceはupdate_last_done=falseを保存リクエストに含めること（tz_offsetは不要）。ただしprogress=100のCompletion_Triggerに該当する場合はbatch-completion-uiの完了フローが優先されるため本基準は適用されない
5. progressおよびactual_time以外のフィールド編集時には、Update_Last_Done_Checkboxを表示しないこと
6. Detail_Panelはlast_done_atを読み取り専用で表示し、直接編集を受け付けないこと
7. トグルスイッチによる完了切り替え時、Detail_Save_Serviceはtz_offset（JSのgetTimezoneOffset()値）を完了リクエストに含めること

### Requirement 9: 種別ラジオボタンUI

**User Story:** ユーザーとして、種別をラジオボタンで直感的に切り替えたい。ドロップダウンより少ない操作で変更するため。

#### Acceptance Criteria

1. Detail_Panelはtask_typeを「TODO」「予定」の2択ラジオボタンで表示すること
2. ラジオボタンの選択変更時、Detail_Panelは即座にDetail_Save_Service経由でtask_typeを保存すること
3. task_type変更に伴うevent_atラベル切り替え（「期限」⇔「開始日時」）は従来通り動作すること

### Requirement 10: カレンダーピッカーUI

**User Story:** ユーザーとして、期限/開始日時をカレンダーから直感的に選択したい。日付入力の手間を減らすため。

#### Acceptance Criteria

1. Detail_Panelはevent_atフィールドのクリックでCalendar_Picker（日付選択）とTime_Picker（時刻選択）を表示すること
2. Calendar_Pickerは「今日」「明日」「1週間後」のショートカットボタンを配置すること
3. ショートカットボタン押下時、該当日付が即セットされCalendar_Pickerが閉じること
4. Time_Pickerは5分刻み（0, 5, 10, ..., 55）で時刻を選択可能とすること
5. Time_Pickerの時間（0〜23）・分（0〜55）は端で止まりループしないこと
6. event_atのデフォルト時刻は00:00とすること
7. 日付・時刻選択後、Detail_Panelは即座にDetail_Save_Service経由でevent_atを保存すること
8. event_atはユーザーのローカル日時（壁時計日時）として扱い、フロントエンドは `YYYY-MM-DDTHH:mm:ss` 形式（タイムゾーン情報なし）で送信すること。toISOString()によるUTC変換や、tz_offsetによる時刻補正は行わないこと
9. 保存成功レスポンスを受信した際、Calendar_Picker / Time_Pickerおよびevent_at表示欄の時刻がユーザーが選択した値から変わらないこと

### Requirement 11: ステータストグルスイッチUI

**User Story:** ユーザーとして、ステータスをスイッチで素早く切り替えたい。完了/未完了の変更を1タップで行うため。

#### Acceptance Criteria

1. Detail_Panelはstatusを未完了/完了のトグルスイッチで表示すること
2. 未完了→完了のスイッチ切り替え時の動作はRequirement 3に従うこと
3. 完了→未完了のスイッチ切り替え時の動作はRequirement 4に従うこと

### Requirement 12: 優先度セグメントコントロールUI

**User Story:** ユーザーとして、優先度を横並びボタンで素早く変更したい。現在の優先度と選択肢が一目で分かるため。

#### Acceptance Criteria

1. Detail_Panelはpriorityをnone/priority/highestの3ボタン横並びセグメントコントロールで表示すること
2. 選択中のボタンはハイライト表示されること
3. ボタンタップ時、Detail_Panelは即座にDetail_Save_Service経由でpriorityを保存すること

### Requirement 13: 進捗スライダーUI

**User Story:** ユーザーとして、進捗をスライダーで直感的に設定したい。数値入力よりドラッグ操作で素早く変更するため。

#### Acceptance Criteria

1. Detail_Panelはprogressを0〜100の連続値スライダーで表示し、横にパーセント数値を表示すること
2. スライダー操作で値が変更された場合、Detail_Save_Service経由で保存すること（デバウンスあり）
3. progress=100到達時のCompletion_Trigger動作は従来仕様を維持すること
4. 進捗スライダーはTimeInputComponent（離散値スライダー）とは独立した連続値スライダーであること
