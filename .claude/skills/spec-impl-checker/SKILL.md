---
name: spec-impl-checker
description: Kiro spec と Codex 実装の整合性、要件カバレッジ、設計遵守、タスク完了状況を確認するときに使う。
---

# Spec と実装の整合性確認

Kiro が spec を生成し Codex が実装した場合の確認観点（ステップ6）:

1. **要件カバレッジ**: `requirements.md` の全受け入れ基準がテストで検証されている
2. **設計の遵守**: `design.md` のアーキテクチャ・インターフェース定義が実装と一致している
3. **タスクの完了**: `task.md` の全タスクが実装済みかつテスト済み
4. **ステアリングとの整合**: `development-rules.md` の制約を違反していない

Claude Code が担うのはステップ3（spec の記述品質）とステップ6（コード品質・spec 整合性）。
Kiro はステップ7で spec 完了処理を行う。詳細は `docs/CONTRIBUTING.md` を参照。
