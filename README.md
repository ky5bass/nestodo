# nestodo

階層化した TODO・予定を管理するタスク管理アプリです。

## 技術構成

- Angular
- FastAPI / SQLAlchemy
- PostgreSQL
- Docker Compose

## 開発環境

Docker と Docker Compose が必要です。

```bash
cp .env.example .env
# .env のユーザー名とパスワードを設定
docker compose up --build
```

起動後、<http://localhost:4200> を開いてください。

## 検証

```bash
docker compose config
docker compose --profile test run --rm backend-test
docker compose --profile test run --rm frontend-test
```

仕様は [`docs/requirements-spec.md`](docs/requirements-spec.md)、開発手順は
[`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) を参照してください。
