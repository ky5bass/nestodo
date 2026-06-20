---
inclusion: manual
description: GitHub Issue を確認して既存 spec の更新・新規 spec の作成・既存 spec のアーカイブを行い、spec PR を作成する手順
---

# Issue から spec を更新・作成・アーカイブして PR を作成する手順

この steering は、GitHub Issue の内容をもとに既存 spec の `requirements.md` と `design.md` を更新する、新規 spec を作成する、または既存 spec をアーカイブし、spec 変更のみを含む PR を作成するときに使用する。

## 依頼形式

ユーザーは次のように依頼する:

```text
#spec-update-from-issue Issue #XX を spec に反映してください。
```

spec 名は依頼に含まれない前提とする。Issue の内容と `docs/spec-index.md` を確認して対象 spec 一覧を特定し、判断できない場合はユーザーに確認する。
Issue の内容に対応する既存 spec がない、または Issue が新規 spec を求めている場合は、新規 spec として扱う。
Issue が既存 spec の廃止・削除を求めている場合は、アーカイブ対象として扱う。
対象 spec が 1 件の場合も、必ずリストとして扱う。各 spec は既存更新・新規作成・アーカイブのいずれかを区別する。

## 手順

1. `#github-operations` steering を参照する
2. `git status --short` で未コミット変更がないことを確認する
3. 未コミット変更がある場合は作業を止め、ユーザーに扱いを確認する
4. `git switch main` で `main` ブランチに切り替える
5. `git pull --ff-only` で `main` を最新化する
6. `gh issue view <番号> --repo ky5bass/nestodo --comments --json body,comments` で Issue 本文とコメントを確認する
7. `docs/spec-index.md` と `.kiro/specs/` 配下を確認し、Issue の内容に対応する既存 spec を特定する。対応する既存 spec がない、または Issue が新規 spec を求めている場合は新規 spec として扱う。Issue が既存 spec の廃止・削除を求めている場合はアーカイブ対象として扱う。既存・新規・アーカイブを判断できない場合はユーザーに確認する
8. `git switch -c spec/issue-<番号>` で Issue 番号を含む新規ブランチを作成して切り替える
9. 対象 spec 一覧を作成し、各 spec を既存更新・新規作成・アーカイブのいずれかで区別したうえで、以降の作業・PR 本文・最終出力では常にリスト形式で列挙する
10. 既存 spec を更新する場合は、対象 spec ディレクトリの `requirements.md` と `design.md` を読む
11. 新規 spec を作成する場合は「新規 spec 作成手順」に従ってディレクトリと `.config.kiro`・`requirements.md`・`design.md` を作成し、`docs/spec-index.md` に登録する
12. アーカイブする場合は「spec アーカイブ手順」に従ってディレクトリを `_archived/` へ移動し、`docs/spec-index.md` から登録を取り除く
13. Issue の目的・背景・要件を、更新・新規作成する各 spec の `requirements.md` に反映する
14. 設計判断と理由を、更新・新規作成する各 spec の `design.md` に反映する
15. 変更後に更新・新規作成した各 spec の `requirements.md` と `design.md` がそれぞれ 150 行以内であることを確認する
16. `git diff --stat` と `git diff --name-only` で、変更が spec ファイル（新規作成・アーカイブの場合は `docs/spec-index.md` と `.github/ISSUE_TEMPLATE/feature.yml` を含む）だけであることを確認する
17. 上記以外の変更が含まれている場合は PR 作成前にユーザーへ確認する
18. `git add` で変更したファイル（新規作成・アーカイブの場合は `docs/spec-index.md` と `.github/ISSUE_TEMPLATE/feature.yml` を含む）をステージする
19. `git commit -m "docs: Issue #<番号> の spec を更新"` でコミットする
20. `git push -u origin spec/issue-<番号>` でブランチを push する
21. `.github/PULL_REQUEST_TEMPLATE/spec.md` をもとに PR 本文を作成する
22. `gh pr create --repo ky5bass/nestodo --title "docs: Issue #<番号> の spec を更新" --body-file <PR本文ファイル>` で PR を作成する
23. 最終出力に、更新・新規作成した spec がある場合は Claude Code に spec 品質レビューを依頼するプロンプトを、アーカイブした spec がある場合はアーカイブ内容の整合性レビューを依頼するプロンプトをコードブロックで出力する

## 新規 spec 作成手順

Issue の内容に対応する既存 spec がない、または Issue が新規 spec を求めている場合に行う。

1. spec 名は英小文字のハイフン区切り（kebab-case）で機能内容を表す簡潔な名前にし、既存の `.kiro/specs/` ディレクトリ名と重複しないことを確認する。名前に迷う場合はユーザーに確認する
2. Kiro の spec 作成機能で `.kiro/specs/<新規spec名>/` を初期化し、固有の `specId`、`workflowType: requirements-first`、`specType: feature` を持つ `.config.kiro` を作成する。既存 spec の `.config.kiro` や `specId` は流用しない
3. 初期化したディレクトリに `requirements.md` と `design.md` を新規作成する
4. `docs/spec-index.md` の「Spec 一覧」表に新規 spec の行を追加する。バージョンは `-`、状態は `未着手` とし、概要・主な領域・依存 spec・関連 spec を記入する
5. 新規 spec が既存の共通領域に関わる場合は、`docs/spec-index.md` の「共通領域」にも追記する
6. `tasks.md` はこの手順では作成しない（spec PR マージ後の別ステップで作成する）

`.kiro/specs/` 配下にファイルを新規作成すると、hook「Spec ドロップダウン同期」が `.github/ISSUE_TEMPLATE/feature.yml` の対象 spec ドロップダウンを自動更新する。hook が動作せず未更新の場合は、`.kiro/specs/` 配下（`_archived` を除く）のディレクトリ名をアルファベット順に並べ、末尾に「新規 spec」「未定（後で判断）」を追加する形で feature.yml の options を手動更新する。

## spec アーカイブ手順

Issue が既存 spec の廃止・削除を求める場合に行う。spec は物理削除せず `_archived/` へ移動して経緯を残す。

1. `docs/spec-index.md` で対象 spec を依存 spec・関連 spec に持つ他 spec がないか確認し、ある場合は影響をユーザーに報告して扱いを確認する
2. `git mv .kiro/specs/<spec名>/ .kiro/specs/_archived/<spec名>/` でディレクトリごと `_archived/` へ移動する（`rm` での物理削除はしない）
3. `docs/spec-index.md` の「Spec 一覧」表から対象 spec の行を削除し、他 spec の依存 spec・関連 spec 列と「共通領域」から対象 spec への参照を取り除く
4. アーカイブはディレクトリ作成を伴わず hook が動作しないため、`.github/ISSUE_TEMPLATE/feature.yml` の対象 spec ドロップダウンから対象 spec を手動で除外する

## 対象 spec 一覧の形式

対象 spec は、1 件だけでも必ず次の形式で列挙する:

```markdown
対象 spec:
- 更新: `.kiro/specs/<spec名>/`
```

新規作成・アーカイブを含む場合も種別を明記し、すべての spec を列挙する:

```markdown
対象 spec:
- 更新: `.kiro/specs/<既存spec名>/`
- 新規作成: `.kiro/specs/<新規spec名>/`
- アーカイブ: `.kiro/specs/_archived/<アーカイブspec名>/`
```

## 更新ルール

- `requirements.md` にはユーザーストーリーと受け入れ基準を書く
- `design.md` には「〜という考えから〜とした」「〜という要望を受けたため〜とした」のように、設計判断の理由が分かる形で書く
- 既存 spec の意図を保ち、Issue で求められていない仕様変更を追加しない
- 120 行を超える場合は、更新前または更新後に spec 分割の必要性をユーザーに相談する
- 150 行を超える更新は行わず、分割案を提示する
- 新規 spec を作成する場合は、固有の `specId` を持つ `.config.kiro` を作成し、`docs/spec-index.md` への登録と、関わる共通領域への追記を必ず行う
- 新規 spec の PR には `tasks.md` を含めない
- 既存 spec をアーカイブする場合は `git mv` で `_archived/` へ移動し、`rm` での物理削除はしない。`docs/spec-index.md` からの登録削除と他 spec の参照除去を必ず行う
- PR には spec 変更（新規作成・アーカイブの場合は `docs/spec-index.md`・`.github/ISSUE_TEMPLATE/feature.yml` を含む）のみを含め、コード変更を含めない
- PR 本文は `.github/PULL_REQUEST_TEMPLATE/spec.md` を使用し、対象 Issue、更新・新規作成・アーカイブした spec 一覧、変更概要を記載する。更新・新規作成した spec は requirements/design の変更概要と行数確認結果を記載し、アーカイブした spec は移動先と参照除去の確認結果を記載する。新規作成・アーカイブの場合はその旨と `docs/spec-index.md` 更新を変更概要に明記する

## 最終出力に含める Claude Code 依頼プロンプト

PR 作成後、最終出力の最後に変更種別に応じた Claude Code 向けプロンプトを出力する。
対象 spec は必ず種別付きのリストで列挙し、1 件の場合も箇条書きにする。

更新・新規作成した spec がある場合は、次の品質レビュープロンプトを出力する。アーカイブした spec は `/spec-quality-review` の対象に含めない。

````markdown
Claude Code へのレビュー依頼プロンプト:

```text
/spec-quality-review

以下の spec PR をレビューしてください。

PR: <PR URL>
Issue: <Issue URL>

対象 spec:
- 更新: `.kiro/specs/<既存spec名>/`
- 新規作成: `.kiro/specs/<新規spec名>/`
```
````

アーカイブした spec がある場合は、品質レビュープロンプトとは別に次の整合性レビュープロンプトを出力する。更新・新規作成とアーカイブが同じ PR に含まれる場合は、両方のプロンプトを出力する。

````markdown
Claude Code へのアーカイブ整合性レビュー依頼プロンプト:

```text
以下の spec PR について、spec アーカイブの整合性をレビューしてください。

PR: <PR URL>
Issue: <Issue URL>

対象 spec:
- アーカイブ: `.kiro/specs/_archived/<アーカイブspec名>/`

次を確認してください:
- 対象 spec が物理削除されず、ディレクトリごと `_archived/` へ移動されている
- `docs/spec-index.md` の Spec 一覧、依存 spec、関連 spec、共通領域から不要な参照が除去されている
- `.github/ISSUE_TEMPLATE/feature.yml` の対象 spec ドロップダウンから除外されている
- Issue で求められていない spec 内容の変更やコード変更が含まれていない
```
````
