---
inclusion: manual
description: 120行を超えた既存 spec の要件・設計を再配置し、spec 分解 PR を作成する手順
---

# spec 分解手順

この steering は、既存 spec の `requirements.md` または `design.md` が 120 行を超えた場合に、既存の要件・設計を複数 spec へ再配置し、spec 分解のみを含む PR を作成するときに使用する。

## 依頼形式

ユーザーは次のように依頼する:

```text
#spec-split <spec名> を分解してください。
```

`<spec名>` は `.kiro/specs/<spec名>/` のディレクトリ名を指す。

## 手順

1. `#github-operations` steering を参照する
2. `git status --short` で未コミット変更がないことを確認する
3. 未コミット変更がある場合は作業を止め、ユーザーに扱いを確認する
4. `git switch main` で `main` ブランチに切り替える
5. `git pull --ff-only` で `main` を最新化する
6. `.kiro/specs/<spec名>/requirements.md` と `.kiro/specs/<spec名>/design.md` を読む
7. `docs/spec-index.md` を読み、対象 spec の依存 spec・関連 spec・共通領域を確認する
8. 対象 spec の `requirements.md` と `design.md` の行数を確認し、120 行以下の場合は分解せずユーザーに報告する
9. `git switch -c spec/split-<spec名>` で新規ブランチを作成して切り替える
10. 既存 spec の責務を分解し、移動先の spec 名一覧を決める
11. 分解前の元 spec の `requirements.md` と `design.md` に含まれる全要素を洗い出し、分解後の配置先と、分解後各要素の由来を対応表として整理する
12. 分解後の各 spec について、元 spec の要件・設計を `requirements.md` と `design.md` へ再配置する
13. 必要に応じて元 spec の `requirements.md` と `design.md` を縮小し、残す責務だけにする。元 spec に残す責務がない場合は、`git rm` で元 spec の `requirements.md` と `design.md` を削除する
14. `docs/spec-index.md` を更新し、分解後の spec 一覧・依存 spec・関連 spec・共通領域を反映する
15. 分解後の各 spec の `requirements.md` と `design.md` がそれぞれ 150 行以内であることを確認する
16. 対応表を使って、分解前の元 spec の全要素が分解後の spec に含まれており、かつ分解後の全要素が元 spec に由来することを確認する
17. `git diff --stat` と `git diff --name-only` で、変更が spec ファイルと `docs/spec-index.md` のみであることを確認する
18. spec 分解に不要な変更が含まれている場合は PR 作成前にユーザーへ確認する
19. `git add` で変更した spec ファイルと `docs/spec-index.md` をステージする
20. `git commit -m "docs: <spec名> spec を分解"` でコミットする
21. `git push -u origin spec/split-<spec名>` でブランチを push する
22. `.github/PULL_REQUEST_TEMPLATE/spec-split.md` をもとに PR 本文を作成する
23. `gh pr create --repo ky5bass/nestodo --title "docs: <spec名> spec を分解" --body-file <PR本文ファイル>` で PR を作成する
24. 最終出力に、Claude Code に spec 分解必要十分性レビューを依頼するためのプロンプトをコードブロックで出力する

## 分解ルール

- 分解前の仕様内容を変えず、責務の移動・切り出しに集中する。元 spec 自体を残す必要はない
- 元 spec の `requirements.md` と `design.md` に含まれる Requirement、受け入れ基準、設計判断、インターフェース、データ構造、例外、制約、テスト方針は、分解後のいずれかの spec に必ず含める
- 共通のデータモデルや全体アーキテクチャは `docs/requirements-spec.md` に寄せ、個別 spec に重複させない
- 分解後の各 spec は、単独で読んでもユーザーストーリー・受け入れ基準・設計判断が分かる状態にする
- 依存関係や優先適用関係がある場合は、各 spec と `docs/spec-index.md` の両方に明記する
- `docs/spec-index.md` には、分解後の spec を必ず登録する
- 元 spec の責務をすべて移動した場合、元 spec の `requirements.md` と `design.md` は削除してよい。ただし削除には必ず `git rm` を使う
- 分解 PR では `tasks.md` と実装コードを含めない
- 既存 spec に `tasks.md` がある場合は削除・更新しない

## PR 本文ルール

- PR 本文は `.github/PULL_REQUEST_TEMPLATE/spec-split.md` を使用する
- 分解内容には、元 spec と分解後の spec 一覧、責務の移動概要を記載する
- 分解対応表には、元 spec の `requirements.md` と `design.md` に含まれていた全要素、分解後の配置先、分解後各要素の由来を記載する
- 更新した索引には、`docs/spec-index.md` へ反映した分解後 spec・依存 spec・関連 spec・共通領域を記載する
- 確認事項には、コード変更なし、`tasks.md` 変更なし、`docs/spec-index.md` 更新済み、各 spec の行数確認結果を記載する

## 最終出力に含める Claude Code 依頼プロンプト

PR 作成後、最終出力の最後に次の形式で Claude Code に渡すプロンプトを出力する。
対象 spec は、元 spec と分解後の spec をすべて列挙する。

````markdown
Claude Code へのレビュー依頼プロンプト:

```text
/spec-split-completeness-review

以下の spec 分解 PR について、分解必要十分性レビューをしてください。

PR: <PR URL>

対象 spec:
- `.kiro/specs/<元spec名>/`
- `.kiro/specs/<分解後spec名>/`
```
````
