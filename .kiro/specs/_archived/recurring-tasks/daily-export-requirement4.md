# 保留メモ: daily-export から退避した定期タスク要件

元ファイル: `.kiro/specs/daily-export/requirements.md` の Requirement 4

---

### Requirement: 定期タスクのエクスポート処理

**User Story:** ユーザーとして、定期タスクの次回分まで日報に含めたい。直近の予定を把握するため。

#### Acceptance Criteria

1. WHEN 定期タスク（Template_Task）がエクスポート対象の場合、Export_Serviceは当日分のInstance_Taskに加え、次回予定のInstance_Task（event_atが当日より後の最初の1件）までを出力に含めること
2. WHEN 次回Instance_Taskが存在しない場合、Export_Serviceは当日分のみを出力すること
3. THE Export_Serviceは次回Instance_Taskを Remaining_Tasksセクションに含めること
