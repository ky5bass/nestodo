---
name: "spec-split"
description: >
  120行を超えた既存specの要件・設計を複数specへ再配置し、spec分解PRを作成する。
  また、作成したspec分解PRのレビュー指摘への対応も行う。
  使用タイミング: specのrequirements.mdまたはdesign.mdが120行を超えた場合、またはspec分解PRのレビュー指摘に対応する場合に使用する。
  トリガーキーワード（日本語）: spec分解, spec-split, specを分解, spec分割。
  トリガーキーワード（英語）: spec split, split spec。
metadata:
  version: "1.0"
  author: "kiro"
---

# spec 分解手順

この steering は、既存 spec の `requirements.md` または `design.md` が 120 行を超えた場合に、既存の要件・設計を複数 spec へ再配置し、spec 分解のみを含む PR を作成するときに使用する。

## 依頼形式

ユーザーは次のように依頼する:

```text
#spec-split <spec名> を分解してください。
```

既存の spec 分解 PR に投稿されたレビュー指摘へ対応する場合は、同じ steering を再度呼び出す:

```text
#spec-split spec 分解 PR #XX のレビュー指摘に対応してください。
```

`<spec名>` は `.kiro/specs/<spec名>/` のディレクトリ名を指す。

## モード判定

- spec の分解を依頼された場合は「新規 PR 作成モード」を実行する
- 既存 PR のレビュー指摘対応を依頼された場合は「レビュー指摘対応モード」を実行する
- レビュー指摘対応モードでは、`main` への切り替え、新規ブランチ作成、新規 PR 作成を行わない

## 新規 PR 作成モード

1. `#github-operations` steering を参照する
2. `git status --short` で未コミット変更がないことを確認する
3. 未コミット変更がある場合は作業を止め、ユーザーに扱いを確認する
4. `git switch main` で `main` ブランチに切り替える
5. `git pull --ff-only` で `main` を最新化する
6. `.kiro/specs/<spec名>/requirements.md` と `.kiro/specs/<spec名>/design.md` を読む
7. `docs/spec-index.md` を読み、対象 spec の依存 spec・関連 spec・共通領域を確認する
8. `git switch -c spec/split-<spec名>` で新規ブランチを作成して切り替える
9. 既存 spec の責務を分解し、移動先の spec 名一覧を決める
10. 分解前の元 spec の `requirements.md` と `design.md` に含まれる全要素を洗い出し、分解後の配置先と、分解後各要素の由来を対応表として整理する
11. 分解後の各 spec について、元 spec の要件・設計を `requirements.md` と `design.md` へ再配置する
12. 必要に応じて元 spec の `requirements.md` と `design.md` を縮小し、残す責務だけにする。元 spec に残す責務がない場合は、`git rm` で元 spec の `requirements.md` と `design.md` を削除する
13. `docs/spec-index.md` を更新し、分解後の spec 一覧・依存 spec・関連 spec・共通領域を反映する
14. 削除・改名した元 spec 名を参照しているファイルを洗い出し、各参照を由来に対応する分解後 spec 名へ更新する（対象範囲は「分解ルール」を参照）
15. 分解後の各 spec の `requirements.md` と `design.md` がそれぞれ 150 行以内であることを確認する
16. 対応表を使って、分解前の元 spec の全要素が分解後の spec に含まれており、かつ分解後の全要素が元 spec に由来することを確認する
17. `grep -rn "<元spec名>" . --exclude-dir=.git` を実行し、削除・改名した元 spec 名への参照がリポジトリ全体に残っていないことを確認する。意図的に残す参照がある場合は、その理由を PR 本文に明記してユーザーの承認を得る
18. `git diff --stat` と `git diff --name-only` で、コード・テスト・`tasks.md` の変更が含まれず、変更が spec ファイル・`docs/spec-index.md`・参照を更新したファイルに限られることを確認する
19. spec 分解に不要な変更が含まれている場合は PR 作成前にユーザーへ確認する
20. `git add` で変更した spec ファイル・`docs/spec-index.md`・参照を更新したファイルをステージする
21. `git commit -m "docs: <spec名> spec を分解"` でコミットする
22. `git push -u origin spec/split-<spec名>` でブランチを push する
23. `.github/PULL_REQUEST_TEMPLATE/spec-split.md` をもとに PR 本文を作成する
24. `gh pr create --repo ky5bass/nestodo --title "docs: <spec名> spec を分解" --body-file <PR本文ファイル>` で PR を作成する
25. 最終出力に、Claude Code に spec 分解必要十分性レビューを依頼するためのプロンプトをコードブロックで出力する

PR 本文の末尾には、`#github-operations` steering に従って Kiro の署名を付ける。

## レビュー指摘対応モード

1. `#github-operations` steering を参照する
2. `git status --short` で作業ツリーを確認し、対象 PR と無関係な未コミット変更がある場合は作業を止める
3. PR 本文、head ブランチ、head commit SHA、差分を取得する
4. PR 本文に `<!-- ai-agent:kiro -->` がある場合は Kiro が作成した PR であることを確認する。別エージェントのマーカーがある場合は作業を止める。マーカーのない既存 PR は、spec 分解 PR であることを本文と差分から確認して続行してよい
5. 対象 PR の head ブランチへ切り替え、リモートの最新状態を fast-forward で取り込む
6. PR のインラインレビューコメントと通常コメントを取得する。`<!-- claude-review:spec-split-completeness:` を含む未解決の指摘を主対象とし、各スレッドの返信も読む
7. base 側の元 spec、PR 側の分解後 spec、分解対応表、`docs/spec-index.md` を読み、各指摘を独立に評価する
8. 妥当な指摘は、元 spec に対する必要十分性を保ち、新しい仕様を追加せず修正する
9. 対応しない指摘は、指摘が誤っている、元 spec に由来しない変更を要求している、または分解 PR のスコープ外である理由と根拠を整理する。レビュー指摘は必ず採用するものではない
10. 修正した場合は必要十分性、変更ファイルを再検証し、atomic commit を作成して同じ head ブランチへ push する
11. すべての指摘スレッドへ、対応内容と commit SHA・検証結果、または対応しない具体的な理由と根拠を返信する
12. 返信には Kiro の署名を付ける。Claude Code の再確認前に Kiro 自身でスレッドを解決しない
13. 最終出力に、同じ `/spec-split-completeness-review` を再度呼び出して指摘対応を確認するためのプロンプトを出力する

再確認依頼は次の形式にする:

```text
/spec-split-completeness-review

spec 分解 PR #<PR番号> のレビュー指摘対応を再確認してください。
```

## 分解ルール

- 分解前の仕様内容を変えず、責務の移動・切り出しに集中する。元 spec 自体を残す必要はない
- 元 spec の `requirements.md` と `design.md` に含まれる Requirement、受け入れ基準、設計判断、インターフェース、データ構造、例外、制約、テスト方針は、分解後のいずれかの spec に必ず含める
- 共通のデータモデルや全体アーキテクチャは `docs/requirements-spec.md` に寄せ、個別 spec に重複させない
- 分解後の各 spec は、単独で読んでもユーザーストーリー・受け入れ基準・設計判断が分かる状態にする
- 依存関係や優先適用関係がある場合は、各 spec と `docs/spec-index.md` の両方に明記する
- `docs/spec-index.md` には、分解後の spec を必ず登録する
- 削除・改名した元 spec 名は、リポジトリ内のどのファイルにも残してはならない。spec 本文・`docs/spec-index.md` だけでなく、`.github/ISSUE_TEMPLATE/` と `.github/PULL_REQUEST_TEMPLATE/` のテンプレート、`.kiro/steering/`、`AGENTS.md`、`CLAUDE.md`、`docs/` 配下を含むすべての参照を分解後 spec 名へ更新する。残存参照は削除済み spec への dangling 参照となり、分解の必要十分性を満たさない
- 元 spec の責務をすべて移動した場合、元 spec の `requirements.md` と `design.md` は削除してよい。ただし削除には必ず `git rm` を使う
- 分解 PR では `tasks.md` と実装コードを含めない
- 既存 spec に `tasks.md` がある場合は削除・更新しない

## PR 本文ルール

- PR 本文は `.github/PULL_REQUEST_TEMPLATE/spec-split.md` を使用する
- 分解内容には、元 spec と分解後の spec 一覧、責務の移動概要を記載する
- 分解対応表には、元 spec の `requirements.md` と `design.md` に含まれていた全要素、分解後の配置先、分解後各要素の由来を記載する
- 更新した索引には、`docs/spec-index.md` へ反映した分解後 spec・依存 spec・関連 spec・共通領域を記載する
- 確認事項には、コード変更なし、`tasks.md` 変更なし、`docs/spec-index.md` 更新済み、削除・改名した元 spec 名への残存参照がないことを記載する

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
