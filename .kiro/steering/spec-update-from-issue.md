---
inclusion: manual
description: GitHub Issue を確認して既存 spec の requirements.md と design.md を更新する手順
---

# Issue から spec を更新する手順

この steering は、GitHub Issue の内容をもとに既存 spec の `requirements.md` と `design.md` を更新するときに使用する。

## 依頼形式

ユーザーは次のように依頼する:

```text
#spec-update-from-issue Issue #XX を spec に反映してください。
```

spec 名は依頼に含まれない前提とする。Issue の内容と `docs/spec-index.md` を確認して対象 spec を特定し、判断できない場合はユーザーに確認する。

## 手順

1. `#github-operations` steering を参照する
2. `gh issue view <番号> --repo ky5bass/nestodo --comments --json body,comments` で Issue 本文とコメントを確認する
3. `docs/spec-index.md` と `.kiro/specs/` 配下を確認し、Issue の内容に対応する既存 spec を特定する
4. 特定した spec ディレクトリの `requirements.md` と `design.md` を読む
5. Issue の目的・背景・要件を `requirements.md` に反映する
6. 設計判断と理由を `design.md` に反映する
7. 変更後に `requirements.md` と `design.md` がそれぞれ 150 行以内であることを確認する

## 更新ルール

- `requirements.md` のメタ情報に、その Issue の URL を記載する
- `requirements.md` にはユーザーストーリーと受け入れ基準を書く
- `design.md` には「〜という考えから〜とした」「〜という要望を受けたため〜とした」のように、設計判断の理由が分かる形で書く
- 既存 spec の意図を保ち、Issue で求められていない仕様変更を追加しない
- 120 行を超える場合は、更新前または更新後に spec 分割の必要性をユーザーに相談する
- 150 行を超える更新は行わず、分割案を提示する
