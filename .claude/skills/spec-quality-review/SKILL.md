---
name: spec-quality-review
description: spec PR を人間がレビューする前に、Kiro spec の requirements.md と design.md の記述品質、行数、設計理由、development-rules.md への準拠を確認するときに使う。
---

# Spec 品質レビュー

spec PR を人間がレビューする前に、対象 spec 一覧に含まれる各 spec の `requirements.md` と `design.md` がプロジェクトの spec 運用ルールに沿っているか確認する。
対象 spec が 1 件だけでも、依頼では必ずリストとして列挙される前提で読む。

## 読むファイル

1. 対象 spec 一覧に含まれる各 `.kiro/specs/<spec名>/requirements.md`
2. 対象 spec 一覧に含まれる各 `.kiro/specs/<spec名>/design.md`
3. `.kiro/steering/development-rules.md`
4. 必要に応じて `docs/requirements-spec.md`

## 確認観点

- `requirements.md` と `design.md` がそれぞれ最大150行以内に収まっているか
- 120行を超えるファイルがある場合、分割提案が必要か
- `requirements.md` にユーザーストーリーと受け入れ基準が明確に書かれているか
- `requirements.md` のメタ情報に、現在の spec 内容に対応した GitHub Issue URL があるか
- `design.md` に、その spec 内で必要なインターフェース・コマンド・データ構造だけが自己完結して書かれているか
- `design.md` に「なぜその設計にしたか」が読み取れる設計判断の理由があるか
- 全体アーキテクチャや共通データモデルなど、`docs/requirements-spec.md` に置くべき内容が混ざっていないか
- requirements と design の間に矛盾、曖昧さ、未定義の用語がないか
- 複数 spec がある場合、spec 間に矛盾や責務の重複がないか

## 出力形式

レビュー結果は、次の順で簡潔に出す。

1. **指摘事項**: 重大度順に、ファイルパスと該当箇所を添えて書く
2. **確認できたこと**: 問題がなかった主要観点を短く書く
3. **提案**: 人間または Kiro に依頼すべき修正があれば具体的に書く

問題がない場合は、指摘事項なしと明記し、残るリスクや未確認範囲だけを書く。
