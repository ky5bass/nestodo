# CLAUDE.md — Claude Code プロジェクト設定

## このプロジェクトの開発ワークフロー概要

このプロジェクトは **3つのAIエージェントが役割分担する協調開発ワークフロー** を採用している。

| エージェント | 役割 | 設定ファイルの場所 |
|---|---|---|
| **Kiro** | 要件定義・設計（Spec駆動） | `.kiro/` |
| **Codex** | 実装・テスト（コーディング） | `AGENTS.md`, `.codex/` |
| **Claude Code（あなた）** | ワークフロー最適化・整合性確認・レビュー支援 | `CLAUDE.md`, `.claude/` |

**フェーズの流れ:**
1. Kiro → `.kiro/specs/<feature>/` に要件・設計・タスク一覧を生成
2. Codex → spec を読んで実装・テストを行いコードを書く
3. Claude Code → spec の品質チェック・設定ファイルの改善・横断的な品質管理

---

## プロジェクトデフォルト構成

```
project-root/
├── CLAUDE.md              # このファイル（Claude Code の設定）
├── AGENTS.md              # Codex の設定（実装ルール・テスト方針）
│
├── .kiro/                 # Kiro の設定・成果物
│   ├── steering/          # Kiro のステアリングファイル（常時読み込み）
│   │   └── development-rules.md  # 開発ルール
│   └── specs/             # Kiro が生成した Spec（要件・設計・タスク）
│       └── <feature-name>/
│           ├── requirements.md
│           ├── design.md
│           └── task.md
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
│       ├── spec-reader/SKILL.md     # Kiro spec の読み方ガイド
│       └── test-reviewer/SKILL.md   # テストコードのレビュー観点
│
├── docs/                  # 人間が書くドキュメント
│   ├── CONTRIBUTING.md    # 開発フロー（ステップ詳細）
│   ├── adr/               # Architecture Decision Records
│   └── decisions.md       # 設計判断の記録
│
├── src/                   # Codex が実装するコード
└── tests/                 # Codex が書くテスト
```

---

## Claude Code（あなた）の役割と責任範囲

### やること
- `.kiro/specs/` の spec ファイルの **記述品質チェック**（行数・設計理由の明記・ルール準拠）
- spec と実装の **整合性確認**（「実装が要件を満たしているか」のレビュー）
- Kiro・Codex 両方の **設定ファイルの改善提案と修正**
- 実装全体の **横断的なコードレビュー**（堅牢性・エラーハンドリング・セキュリティ）
- `.kiro/steering/` ファイルの **内容更新の提案**（プロジェクト変化に追従）
- `AGENTS.md` の **最適化**（Codex がより良いコードを書けるよう調整）

### やらないこと
- Kiro の役割である **要件定義・設計の主導**（提案はしてよい）
- Codex の役割である **機能実装の主担当**（修正・補完はしてよい）
- Kiro の役割である **spec 完了処理**（バージョン付与・一覧更新・`task.md` 削除）

---

## ファイル読み込みの優先順位

Spec と実装で情報が食い違う場合の優先順位:

1. `.kiro/specs/<feature>/requirements.md` （要件が最上位）
2. `.kiro/specs/<feature>/design.md` （設計判断）
3. `AGENTS.md` （実装・テストのルール）
4. `.kiro/steering/development-rules.md` （開発ルール・制約）
5. コード自体のコメント・型定義

---

## コーディング規約（全エージェント共通）

具体的な規約は `.kiro/steering/development-rules.md` を参照すること。
以下はすべてのエージェントが守る最低限のルール:

- コミット前に型チェックとリントを実行する
- テストなしの機能実装はしない
- シークレット・APIキーをコードにハードコードしない
- `AGENTS.md` と `.kiro/steering/` に書かれたルールを常に優先する

---

## Spec と実装の整合性確認手順

Kiro が spec を生成し Codex が実装した場合、**ステップ6で Claude Code が**以下の観点で確認する:

1. **要件カバレッジ**: `requirements.md` の全受け入れ基準がテストで検証されている
2. **設計の遵守**: `design.md` のアーキテクチャ・インターフェース定義が実装と一致している
3. **タスクの完了**: `task.md` の全タスクが実装済みかつテスト済み
4. **ステアリングとの整合**: `development-rules.md` の制約を違反していない

Claude Code が担うのはステップ3（spec の記述品質）とステップ6（コード品質・spec 整合性）。Kiro はステップ7で spec 完了処理を行う。詳細は `docs/CONTRIBUTING.md` を参照。

---

## コンテキスト管理

- セッション開始時に **必ず** `.kiro/specs/` の最新 spec を確認してから作業に入る
- `/compact` 時は、変更されたファイル一覧・未解決の整合性問題・現在のタスク状態を保持するよう指示する
- spec が長い場合は `#spec-reader` スキルを使って要点を抽出してから進める

---

## 設定ファイル改善の基本方針

### Kiro steering を改善するとき
- `inclusion: always` は、プロジェクト全体に必ず必要なルールのみに限定する
- `inclusion: fileMatch` でファイルパターンに応じた条件ロードを活用する
- steering が 100 行を超えたら分割を検討する

### AGENTS.md（Codex 設定）を改善するとき
- テストコマンドは **具体的なコマンド文字列** で書く（曖昧な表現を避ける）
- 実装してはいけないパターン（アンチパターン）を明示的に記載する
- ファイルパス例を含めると Codex の理解精度が上がる

### このファイル（CLAUDE.md）を改善するとき
- 200行以内を目安に保つ。長くなれば `.claude/skills/` に切り出す
- ルールに **判断基準** を書く（「この場合はこう」という形式）
- Kiro・Codex の設定ファイルと内容が重複しないようにする

---

## よく使うコマンド

```bash
# Kiro spec の一覧確認
ls .kiro/specs/

# Codex に spec を渡して実装させるときのコマンド例
codex "Read .kiro/specs/<feature>/requirements.md and design.md, then implement accordingly"

# テスト実行（プロジェクトに合わせて更新すること）
npm test
```

---

## 参考リンク

- [Kiro Steering ドキュメント](https://kiro.dev/docs/steering/)
- [Kiro Specs ドキュメント](https://kiro.dev/docs/specs/)
- [Codex AGENTS.md ガイド](https://developers.openai.com/codex/guides/agents-md)
- [Codex 設定リファレンス](https://developers.openai.com/codex/config-reference)
- [Claude Code ベストプラクティス](https://code.claude.com/docs/en/best-practices)
