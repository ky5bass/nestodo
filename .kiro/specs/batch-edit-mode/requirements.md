# Requirements Document

## Meta

- **GitHub Issue**: https://github.com/ky5bass/nestodo/issues/4
- **スコープ**: 一括編集モードの切り替え、モード内操作、保存/キャンセル、Undo/Redo、並び替え、フィルター解除による全タスク表示

## Introduction

nestodoのタスクリスト画面における「一括編集モード」を定義する。通常モードとの切り替え、モード内でのタスク名変更・追加・削除・並び替え操作、変更のメモリ保持と一括保存/破棄フロー、Undo/Redo機能、およびフィルター解除による全タスク表示を対象とする。

## Glossary

- **Edit_Mode_Controller**: 一括編集モードの状態管理とモード切り替えを担うコンポーネント
- **Change_Buffer**: 編集モード中の変更をメモリ上に保持するバッファ
- **History_Stack**: Undo/Redo操作のための変更履歴スタック
- **Sort_Order_Calculator**: ドラッグ&ドロップ時にsort_orderの中間値を算出するロジック

## Requirements

### Requirement 1: モード切り替え

**User Story:** ユーザーとして、通常モードと一括編集モードを切り替えたい。複数の変更をまとめて確認・保存するため。

#### Acceptance Criteria

1. 通常モードでモード切り替えボタンをクリックした場合、Edit_Mode_Controllerは一括編集モードに遷移し、保存ボタンとキャンセルボタンを表示すること
2. 一括編集モードで未保存の変更がある状態でモード切り替えボタンをクリックした場合、Edit_Mode_Controllerは確認ダイアログを表示すること
3. 一括編集モードで未保存の変更がない状態でモード切り替えボタンをクリックした場合、Edit_Mode_Controllerは通常モードに遷移すること
4. 一括編集モード中、タスク名テキストフィールドのクリックはインライン編集のフォーカスとして動作すること。タスク行のうちタスク名テキストフィールド・ドラッグハンドル・削除ボタンを除いた余白領域をクリックした場合は、詳細パネルを開く（または切り替える）こと。ただし未保存タスク（一時ID `tmp-*`）の場合は詳細パネルを開かないこと
5. 一括編集モード中に開かれた詳細パネルでは、タスク名以外の属性の個別保存が引き続き動作すること

### Requirement 2: タスク名の変更

**User Story:** ユーザーとして、編集モード中にタスク名をインライン編集したい。素早く複数タスクの名前を修正するため。

#### Acceptance Criteria

1. 一括編集モード中、Edit_Mode_Controllerはタスク名を編集可能なテキストフィールドとして表示すること
2. 一括編集モード中にタスク名が編集された場合、Change_BufferはタスクIDと新しい名前を含むリネーム操作を保存すること
3. タスク名が空または255文字を超える場合、Edit_Mode_Controllerはバリデーションエラーを表示し、変更のバッファリングを防止すること

### Requirement 3: タスクの追加

**User Story:** ユーザーとして、編集モード中に新しいタスクを追加したい。思いついたタスクをすぐ記録するため。

#### Acceptance Criteria

1. 一括編集モード中にタスク追加アクションが実行された場合、Change_Bufferは一時ID、タスク名、親ID、算出されたsort_order、task_type（デフォルト: TODO）を含む作成操作を保存すること。親IDがない（Root_Task）場合は、event_atとして現在日時の1ヶ月後をデフォルト設定すること
2. 既存タスクの間に新しいタスクを追加する場合、Sort_Order_Calculatorは隣接タスクのsort_order値の中間値を割り当てること
3. 兄弟リストの末尾に新しいタスクを追加する場合、Sort_Order_Calculatorは最後の兄弟のsort_orderに1.0を加えた値を割り当てること
4. 未保存タスク（一時ID `tmp-*`）の下に新しいタスクを作成する場合、Change_Bufferは親参照として一時IDを保持し、バッチ保存時に`new_parent_client_id`として送信すること

### Requirement 4: タスクの削除

**User Story:** ユーザーとして、編集モード中に不要なタスクを削除したい。リストを整理するため。

#### Acceptance Criteria

1. 一括編集モード中にタスク削除アクションが実行された場合、Change_BufferはタスクIDを含む削除操作を保存すること
2. 子タスクを持つタスクが削除された場合、Change_Bufferはそのタスクと全子孫の削除操作を保存すること
3. 一括編集モード中、Edit_Mode_Controllerは削除されたタスクをリストから即座に非表示にすること
4. 未保存タスク（一時ID `tmp-*`）が削除された場合、Change_Bufferはサーバーへの`delete`操作を生成せず、該当タスクの`create`操作および後続の`move`・`rename`操作をバッファから取り消すこと
5. 未保存タスクが削除され、そのタスクが未保存の子孫タスクを持つ場合、Change_Bufferは子孫の`create`操作および関連する後続操作も同時に取り消すこと
6. 未保存タスクが削除され、既存タスク（DB永続タスク）がその未保存タスクへの`move`操作を持つ場合、Change_Bufferは該当する`move`操作を取り消すこと

### Requirement 5: 並び替え（ドラッグ&ドロップ）

**User Story:** ユーザーとして、タスクをドラッグ&ドロップで並び替えたい。直感的に順序を変更するため。

#### Acceptance Criteria

1. 一括編集モード中、Edit_Mode_Controllerは各タスクにドラッグハンドル（4本線アイコン）を表示し、同一親の兄弟間および異なる親への移動を許可すること。ただし移動先の階層が10階層を超える場合はドロップを禁止すること
2. 2つの既存タスクの間にドロップされた場合、Sort_Order_Calculatorは (前のタスクのsort_order + 後のタスクのsort_order) / 2 のsort_orderを割り当てること
3. 前後のsort_orderの差が0.001未満の場合、Sort_Order_Calculatorは全兄弟を1.0から始まる等間隔の値でリバランスすること
4. 兄弟リストの先頭にドロップされた場合、Sort_Order_Calculatorは最初の兄弟のsort_orderから1.0を引いた値を割り当てること
5. 兄弟リストの末尾にドロップされた場合、Sort_Order_Calculatorは最後の兄弟のsort_orderに1.0を加えた値を割り当てること
6. 並び替え操作が実行された場合、Change_BufferはタスクID、新しいsort_order、および移動先のnew_parent_idを含む操作を保存すること。同一親内の移動でも現在の親ID（Root_Taskの場合はnull）を明示的に保存すること
7. リバランスが発生した場合、Change_Bufferはリバランス対象の全兄弟タスクのsort_order更新も保存すること
8. Child_Taskをルート（parent_id=null）に移動する場合、移動対象のevent_atがnullであれば、Edit_Mode_Controllerはドロップを禁止し、event_atの入力を求めるダイアログを表示すること。ダイアログでevent_atが入力された場合はmove操作にevent_atを含めてChange_Bufferに保存すること
9. 未保存タスク（一時ID）を移動する場合、Change_Bufferは`task_id`ではなく`client_id`として参照を保持し、バッチ保存時に`client_id`フィールドで送信すること
10. 未保存タスクを親として移動先に指定する場合、Change_Bufferは`new_parent_id`ではなく`new_parent_client_id`として送信すること

### Requirement 6: 保存とキャンセル

**User Story:** ユーザーとして、編集内容を一括保存または全破棄したい。変更を確認してからコミットするため。

#### Acceptance Criteria

1. 保存ボタンがクリックされた場合、Edit_Mode_Controllerはバッファ内の全変更を単一のバッチリクエストとしてサーバーに送信し、成功時に通常モードに遷移すること
2. 未保存の変更がある状態でキャンセルボタンがクリックされた場合、Edit_Mode_Controllerは確認ダイアログを表示すること
3. キャンセル確認が承認された場合、Change_Bufferは全変更を破棄し、Edit_Mode_Controllerは通常モードに遷移すること
4. バッチ保存リクエストが失敗した場合、Edit_Mode_Controllerは一括編集モードを維持し、リトライオプション付きのエラー通知を表示すること
5. 未保存の変更がない状態で保存ボタンがクリックされた場合、Edit_Mode_Controllerはリクエストを送信せず通常モードに遷移すること
6. バッチ保存時、サーバーは全操作適用後の最終状態に対してRoot_Task event_at必須不変条件（Root_Taskのevent_atがnon-null）および最大10階層制限を検証し、いずれかに違反する場合はバッチ全体をロールバックしバリデーションエラーを返却すること
7. バッチ保存リクエストにおいて、`create`操作には`client_id`を付与し、同一バッチ内の後続操作が一時IDで参照できるようにすること。バックエンドは操作を順序通り処理し、`client_id`→作成済みタスクのマッピングを維持すること

### Requirement 7: Undo/Redo

**User Story:** ユーザーとして、編集モード内で操作を元に戻したりやり直したい。誤操作を簡単に修正するため。

#### Acceptance Criteria

1. リネーム・追加・削除・並び替え操作が実行された場合、History_Stackはその操作をundoスタックにプッシュし、redoスタックをクリアすること
2. undo操作が実行された場合（Ctrl+Z / Cmd+Z またはundoボタン）、History_Stackは最後の操作を元に戻し、redoスタックにプッシュすること
3. redo操作が実行された場合（Ctrl+Shift+Z / Cmd+Shift+Z またはredoボタン）、History_Stackは最後に元に戻した操作を再適用し、undoスタックにプッシュすること
4. 一括編集モードを終了した場合（保存またはキャンセル）、History_Stackはundoスタックとredoスタックの両方をクリアすること
5. undoスタックが空の場合、Edit_Mode_Controllerはundo操作を無効化すること
6. redoスタックが空の場合、Edit_Mode_Controllerはredo操作を無効化すること
7. 子孫を持つタスクの削除操作がundoされた場合、History_Stackは親タスクと全子孫を単一のundoステップとして復元すること

### Requirement 8: フィルター解除による全タスク表示

**User Story:** ユーザーとして、一括編集モード中にフィルターを解除して完了タスクを含む全タスクを表示したい。完了タスクとの位置関係を考慮した並び替えや、過去タスクの命名不整合を発見・修正するため。

#### Acceptance Criteria

1. 一括編集モードに遷移した場合、Edit_Mode_Controllerは「フィルターを解除する」チェックボックスを表示すること。初期状態ではチェックなし（通常のフィルター適用状態）とすること
2. 「フィルターを解除する」チェックボックスがオンにされた場合、Edit_Mode_Controllerは完了タスクを含む全タスクをリストに表示すること
3. フィルター解除状態で表示された完了タスクに対しても、タスク名変更・削除・並び替え操作が通常のタスクと同様に実行可能であること
4. 「フィルターを解除する」チェックボックスがオフに戻された場合、Edit_Mode_Controllerは通常のフィルター条件を再適用してタスクリストを更新すること。フィルター解除中に行った変更はChange_Bufferに保持されたままとすること
5. 一括編集モードを終了した場合（保存またはキャンセル）、フィルター解除チェックボックスの状態はリセットされ、通常モードでは元のフィルター条件が適用されること
