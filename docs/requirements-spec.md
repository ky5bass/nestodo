# プロジェクト全体仕様

## 技術スタック

| レイヤー | 技術 | 備考 |
|---------|------|------|
| フロントエンド | Angular (最新LTS) | スタンドアロンコンポーネント前提 |
| バックエンド | FastAPI (Python) | 非同期対応 |
| ORM | SQLAlchemy | async対応 (SQLAlchemy 2.0+) |
| データベース | PostgreSQL | |
| 認証 | JWT | アクセストークン + リフレッシュトークン |
| コンテナ | Docker / Docker Compose | 開発・デプロイ共通 |

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

（各specで定義されるエンティティをここに集約予定）

## 開発環境

- Docker Composeで全サービスを起動
- ホットリロード対応（Angular: ng serve / FastAPI: uvicorn --reload）
