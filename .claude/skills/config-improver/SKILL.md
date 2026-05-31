---
name: config-improver
description: Kiro steering、AGENTS.md、CLAUDE.md などの設定ファイルを改善・整理・分割するときに使う。
---

# 設定ファイル改善の基本方針

## Kiro steering を改善するとき
- `inclusion: always` は、プロジェクト全体に必ず必要なルールのみに限定する
- `inclusion: fileMatch` でファイルパターンに応じた条件ロードを活用する
- steering が 120 行を超えたら分割を検討する

## AGENTS.md（Codex 設定）を改善するとき
- テストコマンドは **具体的なコマンド文字列** で書く（曖昧な表現を避ける）
- 実装してはいけないパターン（アンチパターン）を明示的に記載する
- ファイルパス例を含めると Codex の理解精度が上がる

## CLAUDE.md を改善するとき
- 200行以内を目安に保つ。長くなれば `.claude/skills/` に切り出す
- ルールに **判断基準** を書く（「この場合はこう」という形式）
- Kiro・Codex の設定ファイルと内容が重複しないようにする
