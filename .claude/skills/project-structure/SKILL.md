---
name: project-structure
description: プロジェクトの標準ディレクトリ構成、主要ファイル、各エージェントの設定場所を確認するときに使う。
---

# プロジェクトデフォルト構成

```
project-root/
├── CLAUDE.md              # Claude Code の設定
├── AGENTS.md              # Codex の設定（実装ルール・テスト方針）
│
├── .kiro/                 # Kiro の設定・成果物
│   ├── steering/          # Kiro のステアリングファイル（常時読み込み）
│   │   └── development-rules.md  # 開発ルール
│   └── specs/             # Kiro が生成した Spec（要件・設計・タスク）
│       └── <feature-name>/
│           ├── requirements.md
│           ├── design.md
│           └── tasks.md
│
├── .codex/                # Codex のプロジェクトスコープ設定
│   └── config.toml        # Codex CLI 設定（sandbox, approval policy など）
│
├── .claude/               # Claude Code の設定
│   ├── settings.json      # hooks などの設定
│   ├── commands/          # カスタムスラッシュコマンド
│   │   ├── check-spec-impl-gap.md   # spec と実装の乖離を確認
│   │   ├── review-codex-output.md   # Codex の出力をレビュー
│   │   └── update-steering.md       # Kiro steering の更新提案
│   └── skills/            # 再利用可能なスキル
│       ├── spec-reader/SKILL.md         # Kiro spec の読み方ガイド
│       ├── spec-impl-checker/SKILL.md   # 整合性確認の観点
│       ├── config-improver/SKILL.md     # 設定ファイル改善の方針
│       └── project-structure/SKILL.md   # このファイル
│
├── docs/                  # 人間が書くドキュメント
│   ├── CONTRIBUTING.md    # 開発フロー（ステップ詳細）
│   ├── adr/               # Architecture Decision Records
│   └── decisions.md       # 設計判断の記録
│
├── src/                   # Codex が実装するコード
└── tests/                 # Codex が書くテスト
```
