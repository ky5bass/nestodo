# Requirements Document

## Meta

- **GitHub Issue**: (未作成 - Issue作成後にURLを記載)
- **スコープ**: タスク詳細パネルのレイアウト、属性編集、ステータス戻しUI、作業時間入力、エクスポートフラグ、Optimistic UI

## Introduction

nestodoの右サイドパネル（タスク詳細画面）における属性表示・編集機能を定義する。全属性のインライン編集、ステータス戻し時の警告モーダル、作業時間のスライダー＋テキストボックスUI、エクスポートフラグ切り替え、およびOptimistic UIによる保存を対象とする。パネルの開閉・切り替えナビゲーションはdisplay-and-filterで定義済み。

## Glossary

- **Detail_Panel**: タスクの全属性を表示・編集する右サイドパネルUIコンポーネント
- **Time_Input**: 分・時間・日の各単位でスライダーとテキストボックスを連動させる入力コンポーネント
- **Revert_Modal**: 完了→未完了へのステータス戻し時に警告と進捗入力を求めるモーダル
- **Detail_Save_Service**: 詳細パネルからの個別保存をOptimistic UIで処理するサービス

## Requirements

### Requirement 1: 属性表示

**User Story:** ユーザーとして、詳細パネルでタスクの全属性を一覧したい。タスクの全体像を把握するため。

#### Acceptance Criteria

1. タスクが選択された場合、Detail_Panelはtask_name, task_type, event_at, status, progress, priority, estimated_time, actual_time, export_flagを表示すること
2. Detail_Panelはtask_contentsテーブルからpre_info, notes, reflectionを取得し表示すること
3. pre_info, notes, reflectionがnullの場合、Detail_Panelは空の編集可能エリアを表示すること

### Requirement 2: 属性のインライン編集

**User Story:** ユーザーとして、詳細パネルで各属性を直接編集したい。一括編集モードに切り替えずに即座に変更するため。

#### Acceptance Criteria

1. Detail_Panelでの属性編集は一括編集モードの状態に関わらず独立して動作すること
2. task_name, event_at, progress, priority, estimated_time, actual_timeの各フィールドが編集された場合、Detail_Panelは個別にDetail_Save_Serviceへ保存リクエストを送信すること
3. pre_info, notes, reflectionが編集された場合、Detail_Panelはtask_contentsテーブルへの保存リクエストを送信すること
4. progressに0〜100の範囲外の値が入力された場合、Detail_Panelはバリデーションエラーを表示し保存を実行しないこと

### Requirement 3: ステータス戻しUI

**User Story:** ユーザーとして、完了タスクを未完了に戻す際に警告を受けたい。意図しない操作を防ぐため。

#### Acceptance Criteria

1. 完了状態のタスクで未完了への変更が要求された場合、Detail_PanelはRevert_Modalを表示すること
2. Revert_Modalは警告メッセージと進捗入力フィールド（0〜99の範囲）を表示すること
3. Revert_Modalで有効な進捗値が入力され確定された場合、Detail_Save_Serviceはステータスを未完了、進捗を入力値に更新すること
4. Revert_Modalでキャンセルされた場合、Detail_Panelはステータスを完了のまま維持すること

### Requirement 4: 作業時間入力UI

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

### Requirement 5: エクスポートフラグ切り替え

**User Story:** ユーザーとして、日報出力対象を目のアイコンで切り替えたい。直感的にエクスポート対象を管理するため。

#### Acceptance Criteria

1. Detail_Panelはexport_flagの状態を目のアイコンで表示し、trueの場合は開いた目、falseの場合は閉じた目のアイコンを表示すること
2. 目のアイコンがクリックされた場合、Detail_Panelはexport_flagのtrue/falseを切り替え、Detail_Save_Serviceへ保存リクエストを送信すること

### Requirement 6: Optimistic UI保存

**User Story:** ユーザーとして、編集結果が即座にUIに反映されてほしい。待ち時間なく作業を続けるため。

#### Acceptance Criteria

1. Detail_Save_Serviceは保存リクエスト送信前にUIを更新後の値で即座に反映すること
2. サーバーからエラーレスポンスが返却された場合、Detail_Save_ServiceはUIを変更前の値にロールバックし、リトライオプション付きのエラー通知を表示すること
3. リトライが選択された場合、Detail_Save_Serviceは同一の保存リクエストを再送信すること
4. 同一フィールドに対する連続した編集が発生した場合、Detail_Save_Serviceは最新の値のみをサーバーに送信すること（デバウンス処理）
