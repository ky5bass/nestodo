---
inclusion: manual
description: GitHub Issue を確認して既存 spec の requirements.md と design.md を更新し、spec PR を作成する手順
---

# Issue から spec を更新して PR を作成する手順

この steering は、GitHub Issue の内容をもとに既存 spec の `requirements.md` と `design.md` を更新し、spec 変更のみを含む PR を作成するときに使用する。

## 依頼形式

ユーザーは次のように依頼する:

```text
#spec-update-from-issue Issue #XX を spec に反映してください。
```

spec 名は依頼に含まれない前提とする。Issue の内容と `docs/spec-index.md` を確認して対象 spec 一覧を特定し、判断できない場合はユーザーに確認する。
対象 spec が 1 件の場合も、必ずリストとして扱う。

## 手順

1. `#github-operations` steering を参照する
2. `git status --short` で未コミット変更がないことを確認する
3. 未コミット変更がある場合は作業を止め、ユーザーに扱いを確認する
4. `git switch main` で `main` ブランチに切り替える
5. `git pull --ff-only` で `main` を最新化する
6. `gh issue view <番号> --repo ky5bass/nestodo --comments --json body,comments` で Issue 本文とコメントを確認する
7. `docs/spec-index.md` と `.kiro/specs/` 配下を確認し、Issue の内容に対応する既存 spec を特定する
8. `git switch -c spec/issue-<番号>` で Issue 番号を含む新規ブランチを作成して切り替える
9. 対象 spec 一覧を作成し、以降の作業・PR 本文・最終出力では常にリスト形式で列挙する
10. 対象 spec 一覧に含まれる各 spec ディレクトリの `requirements.md` と `design.md` を読む
11. Issue の目的・背景・要件を、該当する各 spec の `requirements.md` に反映する
12. 設計判断と理由を、該当する各 spec の `design.md` に反映する
13. 変更後に各 spec の `requirements.md` と `design.md` がそれぞれ 150 行以内であることを確認する
14. `git diff --stat` と `git diff --name-only` で、変更が spec ファイルだけであることを確認する
15. spec 以外の変更が含まれている場合は PR 作成前にユーザーへ確認する
16. `git add` で変更した spec ファイルをステージする
17. `git commit -m "docs: Issue #<番号> の spec を更新"` でコミットする
18. `git push -u origin spec/issue-<番号>` でブランチを push する
19. `.github/PULL_REQUEST_TEMPLATE/spec.md` をもとに PR 本文を作成する
20. `gh pr create --repo ky5bass/nestodo --title "docs: Issue #<番号> の spec を更新" --body-file <PR本文ファイル>` で PR を作成する
21. 最終出力に、Claude Code に spec 品質レビューを依頼するためのプロンプトをコードブロックで出力する

## 対象 spec 一覧の形式

対象 spec は、1 件だけでも必ず次の形式で列挙する:

```markdown
対象 spec:
- `.kiro/specs/<spec名>/`
```

複数 spec を更新した場合は、すべての spec を列挙する:

```markdown
対象 spec:
- `.kiro/specs/<spec名1>/`
- `.kiro/specs/<spec名2>/`
```

## 更新ルール

- `requirements.md` にはユーザーストーリーと受け入れ基準を書く
- `design.md` には「〜という考えから〜とした」「〜という要望を受けたため〜とした」のように、設計判断の理由が分かる形で書く
- 既存 spec の意図を保ち、Issue で求められていない仕様変更を追加しない
- 120 行を超える場合は、更新前または更新後に spec 分割の必要性をユーザーに相談する
- 150 行を超える更新は行わず、分割案を提示する
- PR には spec 変更のみを含め、コード変更を含めない
- PR 本文は `.github/PULL_REQUEST_TEMPLATE/spec.md` を使用し、対象 Issue、更新した spec 一覧、requirements/design の変更概要、行数確認結果を記載する

## 最終出力に含める Claude Code 依頼プロンプト

PR 作成後、最終出力の最後に次の形式で Claude Code に渡すプロンプトを出力する。
対象 spec は必ずリストで列挙し、1 件の場合も箇条書きにする。

````markdown
Claude Code へのレビュー依頼プロンプト:

```text
/spec-quality-review

以下の spec PR をレビューしてください。

PR: <PR URL>
Issue: <Issue URL>

対象 spec:
- `.kiro/specs/<spec名>/`
```
````
