# プロジェクト全体仕様

## 技術スタック

| レイヤー | 技術 | 備考 |
|---------|------|------|
| フロントエンド | Angular (最新LTS) | スタンドアロンコンポーネント前提 |
| バックエンド | FastAPI (Python) | 非同期対応 |
| ORM | SQLAlchemy | async対応 (SQLAlchemy 2.0+) |
| データベース | PostgreSQL | |
| 認証 | JWT | アクセストークン + リフレッシュトークン |
| コンテナ | Docker / Docker Compose | 開発・テスト・本番の構成を分離 |

## アーキテクチャ概要

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Angular   │────▶│   FastAPI   │────▶│ PostgreSQL  │
│  (SPA)      │◀────│  (REST API) │◀────│             │
└─────────────┘     └─────────────┘     └─────────────┘
```

- フロントエンドはSPAとしてビルドし、APIサーバーとは分離
- バックエンドはRESTful APIを提供
- 認証はJWTベースのステートレス方式

## データモデル

PostgreSQL ENUM: `task_type_enum`(`'TODO'|'SCHEDULE'`)、`task_status_enum`(`'incomplete'|'complete'`)、`priority_enum`(`'none'|'priority'|'highest'`)

### tasks テーブル

| カラム | 型 | 制約 |
|---|---|---|
| id | UUID | PK |
| parent_id | UUID | FK(self) nullable |
| task_name | VARCHAR(255) | NOT NULL |
| task_type | task_type_enum | NOT NULL |
| status | task_status_enum | DEFAULT 'incomplete' |
| progress | SMALLINT | NULL, 0〜100 |
| priority | priority_enum | DEFAULT 'none' |
| sort_order | FLOAT | NOT NULL |
| event_at | TIMESTAMP | Root_Task: NOT NULL |
| estimated_time | INT | NULL（分単位） |
| actual_time | INT | NULL（分単位） |
| preview | TEXT | NULL |
| detail_flag | BOOLEAN | DEFAULT false |
| export_flag | BOOLEAN | DEFAULT true |
| last_done_at | DATE | NULL |
| created_at | TIMESTAMP | DEFAULT now() |
| updated_at | TIMESTAMP | DEFAULT now() |

### task_contents テーブル

| カラム | 型 | 制約 |
|---|---|---|
| task_id | UUID | PK, FK → tasks.id |
| pre_info | TEXT | NULL |
| notes | TEXT | NULL |
| reflection | TEXT | NULL |

## 開発環境

- Docker Composeで全サービスを起動
- ホットリロード対応（Angular: ng serve / FastAPI: uvicorn --reload）
- テスト専用サービスは `test` profile で一時起動し、通常起動には含めない
- 本番デプロイは `compose.prod.yml` と本番用イメージを使用する
