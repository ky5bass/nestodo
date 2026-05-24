# 設計ドキュメント: daily-export

## Overview

日報エクスポート機能のデータ収集・テキスト生成を実現する設計。バックエンドに`ExportService`を配置し、Day_Boundary基準のフィルタリングとテキスト整形を担う。

**設計判断**: テキスト生成をサーバーサイドに集約した。Day_Boundary計算やDB問い合わせが必要であり、フロントエンドに分散させるとロジックの二重管理が発生するためである。

## Architecture

```
ExportButtonComponent (Angular)
└── GET /api/export/daily?tz_offset=-540
    └── ExportService (Python)
        ├── FilterService.get_day_boundary() [display-and-filterから利用]
        └── ExportRepository (SQLAlchemy async)
```

**設計判断**: 既存の`FilterService.get_day_boundary()`を再利用する。Day_Boundary定義の一元管理を維持し、仕様変更時の修正箇所を限定するためである。

## Components and Interfaces

### ExportService (Python - Backend)

```python
class ExportService:
    def __init__(self, db: AsyncSession, filter_service: FilterService): ...

    async def generate_daily_report(self, now: datetime, timezone_offset: int) -> str:
        """日報テキストを生成して返却"""

    def collect_today_results(self, tasks: list[Task], today: date) -> list[Task]:
        """last_done_at=today かつ export_flag=true のタスクを収集"""

    def collect_remaining_tasks(self, tasks: list[Task]) -> list[Task]:
        """status='incomplete' かつ export_flag=true のタスクを収集"""

    def format_report(self, today: date, results: list[Task], remaining: list[Task]) -> str:
        """3セクション構成のテキストを生成"""
```

### APIエンドポイント (FastAPI)

```python
@router.get("/api/export/daily")
async def export_daily(tz_offset: int = Query(...), db: AsyncSession = Depends(get_db)) -> PlainTextResponse:
    """日報テキストをプレーンテキストで返却"""
```

**設計判断**: レスポンスを`PlainTextResponse`とした。JSONでラップせずそのままコピー&ペーストできる形式がユーザーの利用シーンに合致するためである。

## Data Models

### 出力テキストフォーマット

```
# 日報 2025-01-15

## 本日の実績
- [完了] タスクA
- タスクB (進捗: 60%)

## 残タスク
- タスクB (進捗: 60%)
- タスクC (進捗: 未設定)
```

### クエリ対象フィールド（tasksテーブルから参照）

| フィールド | 用途 |
|---|---|
| last_done_at (DATE) | Today_Results判定 |
| export_flag (BOOLEAN) | エクスポート対象判定 |
| status (ENUM) | Remaining_Tasks判定・完了表示 |
| task_name (VARCHAR) | 表示・ソートキー |
| progress (SMALLINT, NULL) | 進捗表示 |

## Correctness Properties

*正しさの性質とは、システムのすべての有効な実行において成り立つべき特性や振る舞いの形式的な記述である。*

### Property 1: Today_Results収集の正当性

*任意の*タスク集合と日付todayに対し、`collect_today_results`の結果は「last_done_at=today かつ export_flag=true」を満たすタスクのみを含み、条件を満たす全タスクを含むこと。

**Validates: Requirements 1.1**

### Property 2: Remaining_Tasks収集の正当性

*任意の*タスク集合に対し、`collect_remaining_tasks`の結果は「status='incomplete' かつ export_flag=true」を満たすタスクのみを含み、条件を満たす全タスクを含むこと。

**Validates: Requirements 2.1**

### Property 3: 未完了実績タスクの重複包含

*任意の*タスク集合において、Today_ResultsかつRemaining_Tasks両方の条件を満たすタスクは、両セクションに出現すること。

**Validates: Requirements 2.4**

### Property 4: セクション出力の情報完全性

*任意の*タスクに対し、Today_Resultsの出力はtask_name・progress・status（完了時は明示マーク）を含み、Remaining_Tasksの出力はtask_name・progress（null時は「未設定」）を含むこと。

**Validates: Requirements 1.2, 1.3, 2.2**

### Property 5: ソート順の不変条件

*任意の*タスク集合に対し、Today_ResultsおよびRemaining_Tasksの出力順はtask_name昇順であること。

**Validates: Requirements 1.4, 2.3**

### Property 6: 出力構造とヘッダー日付

*任意の*datetime・timezone_offsetに対し、出力テキストは「ヘッダー（YYYY-MM-DD）」「本日の実績」「残タスク」の3セクション構成で、各セクションが空行で区切られ、ヘッダー日付がDay_Boundary基準の論理日付と一致すること。

**Validates: Requirements 3.1, 3.2, 3.3**

## Error Handling

| エラー種別 | 条件 | レスポンス |
|---|---|---|
| invalid_tz_offset | tz_offsetが-720〜840の範囲外 | 400 + バリデーションエラー |
| db_error | DB接続失敗・タイムアウト | 500 + エラー通知 |
| empty_export | export_flag=trueのタスクが0件 | 200 + ヘッダー+空メッセージ（正常系） |

**設計判断**: 対象タスク0件をエラーではなく正常レスポンスとした。「本日は作業なし」も有効な日報であり、ユーザーに不要なエラー表示を避けるためである。

## Testing Strategy

**プロパティテスト**: hypothesisを使用し、Property 1〜6をバックエンドで各100回以上検証。`collect_today_results`・`collect_remaining_tasks`・`format_report`は純粋関数に近い設計のためPBTに最適。タグ: `Feature: daily-export, Property N: {text}`

**ユニットテスト**: 空セクション時のメッセージ（「進捗変化なし」「残タスクなし」）、progress=null時の「未設定」表示、Day_Boundary境界値（4:59/5:00）。pytest使用。

**結合テスト**: APIエンドポイントの正常系レスポンス（Content-Type: text/plain確認）、DBからの実データ取得。pytest + httpx使用。
