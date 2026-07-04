---
name: "task-create-from-merged-spec"
description: >
  マージ済みの spec PR を確認し、main を最新化したうえで対象 spec の tasks.md を作成する。
  使用タイミング: spec PR のマージ後、Codex 実装へ渡す tasks.md を作成したい場合に使用する。
  トリガーキーワード（日本語）: task-create-from-merged-spec, tasks.md 作成, タスク作成。
  トリガーキーワード（英語）: create tasks from merged spec, task creation。
metadata:
  version: "1.0"
  author: "kiro"
---

# マージ済み spec から tasks.md を作成する手順

このスキルは、spec PR がマージされた後に、Codex が実装するための `.kiro/specs/<spec名>/tasks.md` を作成するときに使用する。ユーザーの依頼文だけでマージ済みとみなさず、GitHub 上の PR 状態とローカルの `main` を確認してから作業する。

## 依頼形式

ユーザーは次のように依頼する:

```text
#task-create-from-merged-spec 以下の spec PR について tasks.md を作成してください:
PR: #XX

対象 spec:
- `.kiro/specs/<spec名>/`
```

対象 spec が複数ある場合は、すべてリストで列挙される前提とする。対象 spec が不明な場合は推測で作成せず、ユーザーに確認する。

## 実行手順

1. `#github-operations` steering を参照する
2. `git status --short` で未コミット変更がないことを確認する
3. 未コミット変更がある場合は作業を止め、ユーザーに扱いを確認する
4. `gh pr view <PR番号> --repo ky5bass/nestodo --json mergedAt,state,baseRefName,headRefName,url,body` で spec PR がマージ済みであることを確認する
5. PR がマージ済みでない場合は、`tasks.md` を作成せず、マージ後に再依頼するよう報告して終了する
6. PR の base ブランチが `main` であること、PR 本文または差分の対象 spec が依頼内容と一致することを確認する
7. `git switch main` で `main` ブランチに切り替える
8. `git pull --ff-only` で `main` を最新化し、対象 spec の最新内容を取り込む
9. 対象 spec ごとに `requirements.md` と `design.md` を読み、必要に応じて `docs/spec-index.md` と依存 spec を確認する
10. spec の責務・受け入れ基準・設計判断に基づいて実装タスクを作成する
11. `.kiro/specs/<spec名>/tasks.md` を作成する。既に存在する場合は上書きせず、既存内容を確認してユーザーに扱いを確認する
12. タスクは Codex が順番に実装できる粒度に分け、各タスクに必要なテスト・検証を含める
13. 実装順序に依存関係がある場合は、`Task Dependency Graph` を追加する
14. `git diff --stat` と `git diff --name-only` で、変更が対象 spec の `tasks.md` に限られることを確認する
15. `git add .kiro/specs/<spec名>/tasks.md` でステージし、`git commit -m "docs: <spec名> の tasks.md を作成"` で `main` 上に管理用コミットを作成する
16. `git push origin main` で管理用コミットをリモートの `main` に反映する。push に失敗した場合は後続の実装依頼へ進まず、失敗理由をユーザーに報告する
17. `git status --short` で作業ツリーが clean であることを確認する
18. 最終出力に、Kiro の実装フェーズオーケストレーターを開始するためのプロンプトをコードブロックで出力する

## tasks.md 作成ルール

- `requirements.md` の受け入れ基準と `design.md` の設計判断を実装可能なタスクへ分解する
- spec にない機能、抽象化、最適化をタスクに追加しない
- 各トップレベルタスクは、実装とテストがひとまとまりになる単位にする
- チェックポイントが必要な場合は、人間が動作確認しやすい境界に置く
- タスクの完了条件は、コード変更だけでなくテスト・検証まで含める
- 複数 spec を対象にする場合は、spec ごとに tasks.md を作成し、依存関係を明記する

## 最終出力に含める実装フェーズ開始プロンプト

tasks.md 作成後、最終出力の最後に次のプロンプトを出力する。対象 spec は実際のディレクトリ名で列挙し、プレースホルダを残さない。

````markdown
実装フェーズ開始プロンプト:

```text
#implementation-orchestrator 以下の spec の実装フェーズを開始してください:
- `.kiro/specs/<具体的なspec名>/`
```
````
