---
name: github-pr-creator
description: このプロジェクトで gh CLI を使って GitHub Pull Request を作成する。Codex が tasks.md のチェックポイントに到達したとき、spec を完了したとき、またはユーザーが ky5bass/nestodo の実装作業について PR 作成・オープン・準備を依頼したときに使用する。
---

# GitHub PR Creator

## 概要

チェックポイントタスク到達時、または spec 完了時に、`ky5bass/nestodo` の実装 PR を自動作成するためにこの skill を使う。GitHub 操作には `gh` CLI を使い、リポジトリの PR テンプレートを優先する。

## 前提条件

- GitHub コマンドを実行する前に `.kiro/steering/github-operations.md` を読む。
- PR 本文を作成する前に `.github/PULL_REQUEST_TEMPLATE/code.md` を読む。
- 対象 spec を `.kiro/specs/<spec名>/` から確認する。
- 関連する検証コマンドを先に実行する。実行できないコマンドがある場合は、その理由を PR 本文に含める。
- `git status --short --branch` を実行し、ユーザーの無関係な変更を PR に含めない。

## 作成手順

1. 状態を確認する:
   ```bash
   git status --short --branch
   git branch --show-current
   git log --oneline --max-count=5
   ```

2. 現在のブランチが PR 作成に適していることを確認する:
   - `main` から PR を作成しない。
   - 現在 `main` にいる場合は、commit や push の前に `feat/<spec名>` を作成して切り替える。
   - 未コミット変更に無関係なファイルが含まれる場合は停止し、分離が必要な変更を報告する。

3. 必要に応じて commit する:
   - 完了した実装変更だけを commit する。
   - コミットメッセージは conventional commit 形式の `<type>: <説明（日本語）>` にする。
   - commit は atomic に保つ。

4. ブランチを push する:
   ```bash
   git push -u origin <branch>
   ```

5. 一時 Markdown ファイルに PR 本文を作成する:
   - タイトルは conventional commit 形式で、日本語の説明にする。
   - 本文は `.github/PULL_REQUEST_TEMPLATE/code.md` に従い、日本語で記述する。
   - 以下を含める:
     - `spec: .kiro/specs/<spec名>/`。
     - `requirements.md` に Issue 番号や URL がある場合はそれを記載する。
     - `requirements.md` の受け入れ基準と対応するテスト。
     - 実装変更の要約。
     - 検証コマンドと結果。
     - スキップした optional task があれば記載する。
     - 無関係な既存失敗があれば記載する。

6. PR を作成する:
   ```bash
   gh pr create --repo ky5bass/nestodo --title "<title>" --body-file <body-file>
   ```

7. PR URL と検証結果の要約をユーザーに報告する。

## 失敗時の扱い

- `gh` が認証されていない場合は、認証エラーと、ログイン後に再実行すべき正確なコマンドを報告する。
- push に失敗した場合は失敗内容を報告し、ユーザーが明示的に依頼しない限り force push しない。
- 今回の変更が原因で検証に失敗した場合は、PR 作成前に修正する。
- 無関係な既存理由で検証に失敗した場合は、実装自体が完了しているときだけ PR を作成し、その失敗を PR 本文に明記する。
- PR 作成を容易にする目的で破壊的な Git コマンドを使わない。
