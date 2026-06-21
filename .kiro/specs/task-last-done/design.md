# 設計ドキュメント

## Meta

- **バージョン**: v1.0

## Overview
タスクの最終実施日（last_done_at）自動更新ロジックの設計。Day_Boundary（午前5時）基準の論理日付をDATE型で保存する。

## Architecture
last_done_at更新はTask_Serviceのupdate()内で条件判定し、完了遷移時はtask-completion-logicのcomplete()と連携して設定する。tz_offsetはクライアントから必ず送信され、サーバー側でDay_Boundary基準の論理日付を算出する。

## Components and Interfaces
```python
class UpdateTaskInput(BaseModel):
    # last_done_at関連フィールド（他フィールドはtask-crud specを参照）
    update_last_done: bool = True     # progress/actual_time更新時にlast_done_atを更新するか
    tz_offset: int | None = None      # 分単位（JS getTimezoneOffset()値）、-720〜840の範囲

# last_done_at更新ロジック:
# 1. progress or actual_time更新 + update_last_done=true → last_done_at更新
# 2. progress or actual_time更新 + update_last_done=false → last_done_at変更なし
#    ただしprogress=100によるCompletion_Trigger時は完了遷移ルールが優先
# 3. progress/actual_time以外のみの更新 → update_last_doneに関わらず変更なし
#
# Day_Boundary算出:
#   UTC時刻からtz_offsetでローカル時刻を算出し、5:00未満なら前日の日付を返す。
#   例: tz_offset=-540(JST)の場合、UTC 20:00 → JST 5:00 → 当日
#       UTC 19:59 → JST 4:59 → 前日
#
# 完了遷移時（task-completion-logicと連携）:
#   - 即成功（type='completed'）: 対象タスクのlast_done_atを設定
#   - 一括完了（confirmed=true）: 親+全子孫のlast_done_atを設定
#   - tz_offsetはcomplete()の引数として必須
```

## Data Models
tasksテーブルのlast_done_atカラム（DATE型、NULL許容）を使用する。テーブル定義の詳細はtask-crud specを参照。

## Correctness Properties
### Property 1: last_done_at条件付き更新とtz_offset検証
**Validates: Requirements 1.1, 1.2, 1.3, 1.5**
*For any* 非Completion_Trigger更新において、progress/actual_time+update_last_done=trueの場合のみlast_done_at更新。tz_offset欠落/範囲外はエラー。

### Property 2: 完了遷移時のlast_done_at設定
**Validates: Requirements 1.6, 1.7**
*For any* 完了遷移において、(a) 即成功時は対象タスク、(b) confirmed=true時は親+全子孫のlast_done_atを設定。tz_offset不正時はエラー。

## Error Handling
| エラー種別 | 条件 | レスポンス |
|---|---|---|
| invalid_tz_offset | tz_offsetが欠落または-720〜840の範囲外（last_done_at更新時・完了遷移時） | 400 + バリデーションエラー |

統一フォーマット `{ error: { code, message, details? } }` で返却。

## Testing Strategy
- **プロパティテスト**: hypothesisを使用し、上記2プロパティを各100回以上のランダム入力で検証。Property 1はtz_offset境界値（4:59/5:00）と異なるtz_offset値での論理日付算出を検証。Property 2は単体完了成功時の対象タスクおよび一括完了時の全子孫last_done_at設定を検証。タグ: `Feature: task-last-done, Property N: {text}`
- **ユニットテスト**: Day_Boundary境界値（4:59/5:00）、tz_offset欠落・範囲外エラー、update_last_done=falseでの非更新。pytest使用
- **統合テスト**: Day_Boundary境界値でのlast_done_at算出、完了遷移連携時のlast_done_at設定。testcontainersでPostgreSQLコンテナを使用
