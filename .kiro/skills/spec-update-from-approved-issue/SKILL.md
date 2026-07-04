---
name: "spec-update-from-approved-issue"
description: >
  GitHub Issue の承認済みコメントを元に既存 spec の更新・新規 spec の作成・既存 spec のアーカイブを行い、spec PR を作成する。またはレビュー指摘に対応する。
  使用タイミング: ユーザーが Issue の承認済み内容を spec に反映したい場合、または spec PR のレビュー指摘に対応したい場合に使用する。
  トリガーキーワード（日本語）: spec-update-from-approved-issue, spec反映, specに反映, Issue を spec に反映, レビュー指摘に対応。
  トリガーキーワード（英語）: spec update from approved issue, update spec from issue。
metadata:
  version: "1.0"
  author: "kiro"
---

# Issue から spec を更新・作成・アーカイブして PR を作成する手順

この steering は、具体化・承認を行った会話とは別の新しいセッションで、GitHub Issue の最新の承認済み内容をもとに既存 spec の `requirements.md` と `design.md` を更新する、新規 spec を作成する、または既存 spec をアーカイブし、spec 変更のみを含む PR を作成するときに使用する。過去の会話内容は前提にしない。

## 依頼形式

ユーザーは次のように依頼する:

```text
#spec-update-from-approved-issue Issue #XX を spec に反映してください。
```

既存の spec PR に投稿されたレビュー指摘へ対応する場合は、同じ steering を再度呼び出す:

```text
#spec-update-from-approved-issue spec PR #XX のレビュー指摘に対応してください。
```

spec 名は依頼に含まれない前提とする。Issue の最新の承認済みコメントと `docs/spec-index.md` を確認して対象 spec 一覧を特定する。
承認済みコメントが新規 spec を求めている場合は新規作成、既存 spec の廃止・削除を求めている場合はアーカイブとして扱う。
承認済みコメントだけでは対象または変更種別を判断できない場合は、このセッションでユーザーに確認せず、再具体化を案内して終了する。
対象 spec が 1 件の場合も、必ずリストとして扱う。各 spec は既存更新・新規作成・アーカイブのいずれかを区別する。

## モード判定

- Issue の spec 反映を依頼された場合は「新規 PR 作成モード」を実行する
- 既存 PR のレビュー指摘対応を依頼された場合は「レビュー指摘対応モード」を実行する
- レビュー指摘対応モードでは、`main` への切り替え、新規ブランチ作成、新規 PR 作成を行わない

## 新規 PR 作成モード

1. `#github-operations` steering を参照する
2. `git status --short` で未コミット変更がないことを確認する
3. 未コミット変更がある場合は作業を止め、ユーザーに扱いを確認する
4. `git switch main` で `main` ブランチに切り替える
5. `git pull --ff-only` で `main` を最新化する
6. `gh issue view <番号> --repo ky5bass/nestodo --comments --json body,comments` で Issue 本文とコメントを確認する
7. `<!-- spec-update-approved:v1 -->` を含む最新の承認済みコメントを特定する。存在しない場合は spec を変更せず終了し、新しいセッションで `#spec-clarify-from-issue Issue #XX を具体化してください。` を実行するよう案内する
8. 最新の承認済みコメントより後に要件の追加・変更を求めるコメントがある場合は spec を変更せず終了し、新しいセッションで `#spec-clarify-from-issue Issue #XX を具体化してください。` を実行するよう案内する
9. 承認済みコメントだけで変更内容を自己完結して理解できない場合は、過去の会話を補完に使わず、spec を変更せず終了して再具体化を案内する
10. `docs/spec-index.md` と `.kiro/specs/` 配下を確認し、承認済みコメントに記載された対象 spec と変更種別を確認する。記載内容だけでは既存更新・新規作成・アーカイブを判断できない場合も、再具体化を案内する
11. 既存 spec を更新する場合は、対象 spec ディレクトリの `requirements.md` と `design.md` を読む
12. `git switch -c spec/issue-<番号>` で Issue 番号を含む新規ブランチを作成して切り替える
13. 対象 spec 一覧を作成し、各 spec を既存更新・新規作成・アーカイブのいずれかで区別したうえで、以降の作業・PR 本文・最終出力では常にリスト形式で列挙する
14. 新規 spec を作成する場合は「新規 spec 作成手順」に従ってディレクトリと `.config.kiro`・`requirements.md`・`design.md` を作成し、`docs/spec-index.md` に登録する
15. アーカイブする場合は「spec アーカイブ手順」に従ってディレクトリを `_archived/` へ移動し、`docs/spec-index.md` から登録を取り除く
16. Issue の最新の承認済み spec 反映内容に基づき、目的・背景・要件を、更新・新規作成する各 spec の `requirements.md` に反映する
17. Issue の最新の承認済み spec 反映内容に基づき、設計判断と理由を、更新・新規作成する各 spec の `design.md` に反映する
18. spec 化の途中で承認内容にない新しい判断が必要になった場合は編集を止め、このセッションでは対話による具体化を行わない。`git checkout -- .` で未コミット変更を取り消し、`git switch main` と `git branch -D spec/issue-<番号>` で作成したブランチも削除したうえで、新しいセッションで `#spec-clarify-from-issue Issue #XX を具体化してください。` を実行するよう案内する
19. 変更後に更新・新規作成した各 spec の `requirements.md` と `design.md` を読み返し、Issue の承認済み内容が反映されていることを確認する
20. `git diff --stat` と `git diff --name-only` で、変更が spec ファイル（新規作成・アーカイブの場合は `docs/spec-index.md` と `.github/ISSUE_TEMPLATE/feature.yml` を含む）だけであることを確認する
21. 上記以外の変更が含まれている場合は PR 作成前にユーザーへ確認する
22. `git add` で変更したファイル（新規作成・アーカイブの場合は `docs/spec-index.md` と `.github/ISSUE_TEMPLATE/feature.yml` を含む）をステージする
23. `git commit -m "docs: Issue #<番号> の spec を更新"` でコミットする
24. `git push -u origin spec/issue-<番号>` でブランチを push する
25. `.github/PULL_REQUEST_TEMPLATE/spec.md` をもとに PR 本文を作成する
26. `gh pr create --repo ky5bass/nestodo --title "docs: Issue #<番号> の spec を更新" --body-file <PR本文ファイル>` で PR を作成する
27. 最終出力に、更新・新規作成した spec がある場合は Claude Code に spec 品質レビューを依頼するプロンプトを、アーカイブした spec がある場合はアーカイブ内容の整合性レビューを依頼するプロンプトをコードブロックで出力する

PR 本文の末尾には、`#github-operations` steering に従って Kiro の署名を付ける。

## レビュー指摘対応モード

1. `#github-operations` steering を参照する
2. `git status --short` で作業ツリーを確認し、対象 PR と無関係な未コミット変更がある場合は作業を止める
3. `gh pr view <PR番号> --repo ky5bass/nestodo --json body,headRefName,headRefOid,url` で PR 本文、head ブランチ、head commit SHA を確認する
4. PR 本文に `<!-- ai-agent:kiro -->` がある場合は Kiro が作成した PR であることを確認する。別エージェントのマーカーがある場合は対象を取り違えず、作業を止める。マーカーのない既存 PR は、spec PR であることを本文と差分から確認して続行してよい
5. 対象 PR の head ブランチへ切り替え、リモートの最新状態を fast-forward で取り込む
6. PR のインラインレビューコメントと通常コメントを取得する。`<!-- claude-review:spec-quality:` を含む未解決の指摘を主対象とし、各スレッドの返信も読む
7. Issue 本文・コメント、対象 spec、PR 差分を読み、各指摘を独立に評価する
8. 妥当な指摘は、承認済み Issue の範囲と spec 運用ルールを守って修正する
9. 対応しない指摘は、指摘が誤っている、スコープ外、または別変更で扱うべき理由と根拠を整理する。レビュー指摘は必ず採用するものではない
10. 修正した場合は変更ファイル、Issue の承認済み内容との一致を再検証し、atomic commit を作成して同じ head ブランチへ push する
11. すべての指摘スレッドへ返信する
    - 対応した場合: 対応内容、commit SHA、検証結果
    - 対応しない場合: 対応しない判断、具体的な理由、根拠
12. 返信には Kiro の署名を付ける。Claude Code の再確認前に Kiro 自身でスレッドを解決しない
13. 最終出力に、同じ `/spec-quality-review` を再度呼び出して指摘対応を確認するためのプロンプトを出力する

レビュー指摘対応モードでは、指摘を無言で放置してはならない。コード変更や承認済み Issue の範囲外の仕様変更が必要な指摘は、その場で実装せず、対応しない理由または別 Issue が必要な理由を返信する。

再確認依頼は次の形式にする:

```text
/spec-quality-review

spec PR #<PR番号> のレビュー指摘対応を再確認してください。
```

## 新規 spec 作成手順

Issue の内容に対応する既存 spec がない、または Issue が新規 spec を求めている場合に行う。

1. 承認済みコメントに記載された spec 名が英小文字のハイフン区切り（kebab-case）で、機能内容を表す簡潔な名前であり、既存の `.kiro/specs/` ディレクトリ名と重複しないことを確認する。名前が未記載または不適切で新たな判断が必要な場合は、新しいセッションで再具体化する
2. Kiro の spec 作成機能で `.kiro/specs/<新規spec名>/` を初期化し、固有の `specId`、`workflowType: requirements-first`、`specType: feature` を持つ `.config.kiro` を作成する。既存 spec の `.config.kiro` や `specId` は流用しない
3. 初期化したディレクトリに `requirements.md` と `design.md` を新規作成する
4. `docs/spec-index.md` の「Spec 一覧」表に新規 spec の行を追加する。バージョンは `-`、状態は `未着手` とし、概要・主な領域・依存 spec・関連 spec を記入する
5. 新規 spec が既存の共通領域に関わる場合は、`docs/spec-index.md` の「共通領域」にも追記する
6. `tasks.md` はこの手順では作成しない（spec PR マージ後の別ステップで作成する）

`.kiro/specs/` 配下にファイルを新規作成すると、hook「Spec ドロップダウン同期」が `.github/ISSUE_TEMPLATE/feature.yml` の対象 spec ドロップダウンを自動更新する。hook が動作せず未更新の場合は、`.kiro/specs/` 配下（`_archived` を除く）のディレクトリ名をアルファベット順に並べ、末尾に「新規 spec」「未定（後で判断）」を追加する形で feature.yml の options を手動更新する。

## spec アーカイブ手順

Issue が既存 spec の廃止・削除を求める場合に行う。spec は物理削除せず `_archived/` へ移動して経緯を残す。

1. `docs/spec-index.md` で対象 spec を依存 spec・関連 spec に持つ他 spec がないか確認する。影響先があり、その扱いが承認済みコメントに記載されていない場合は、新しいセッションで再具体化する
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
- Issue の最新の承認済み spec 反映内容の範囲を超える仕様変更を追加しない
- 新規 spec を作成する場合は、固有の `specId` を持つ `.config.kiro` を作成し、`docs/spec-index.md` への登録と、関わる共通領域への追記を必ず行う
- 新規 spec の PR には `tasks.md` を含めない
- 既存 spec をアーカイブする場合は `git mv` で `_archived/` へ移動し、`rm` での物理削除はしない。`docs/spec-index.md` からの登録削除と他 spec の参照除去を必ず行う
- PR には spec 変更（新規作成・アーカイブの場合は `docs/spec-index.md`・`.github/ISSUE_TEMPLATE/feature.yml` を含む）のみを含め、コード変更を含めない
- PR 本文は `.github/PULL_REQUEST_TEMPLATE/spec.md` を使用し、対象 Issue、更新・新規作成・アーカイブした spec 一覧、変更概要を記載する。更新・新規作成した spec は requirements/design の変更概要を記載する。アーカイブした spec は移動先と参照除去の確認結果を記載する。新規作成・アーカイブの場合はその旨と `docs/spec-index.md` 更新を変更概要に明記する

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
