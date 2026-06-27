# Skill Creator Skill - 例集

本ドキュメントは、Skill Creator Skillの入力例・出力例・エッジケースをまとめたものである。

## 入力例と期待される応答

### 例1: 基本的なSkill作成リクエスト

**ユーザー入力:**

```
Skill作成
```

**期待される応答（ヒアリング開始）:**

```
Skill作成を開始します。以下の情報を教えてください。

1. Skill名: 作成するSkillの名前（kebab-case形式、例: my-new-skill）
2. 目的・機能: このSkillは何をしますか？
3. トリガー条件: どのようなキーワードでアクティベートしますか？
4. 配置スコープ: グローバル（~/.kiro/skills/）とワークスペース（.kiro/skills/）のどちらに配置しますか？
```

### 例2: 詳細な要件を一度に提供した場合

**ユーザー入力:**

```
Skill作成して。コードレビューを自動化するSkillが欲しい。
名前は code-review-helper で、「レビューして」「Review code」で起動するようにして。
ワークスペースに配置して。
```

**期待される応答（不足分のみ確認）:**

```
ありがとうございます。以下の内容で確認させてください。

【収集した要件】
- Skill名: code-review-helper
- 目的・機能: コードレビューを自動化する
- トリガー条件: 「レビューして」「Review code」
- 配置スコープ: ワークスペース（.kiro/skills/）
- ワークフロー: コードの変更差分を分析し、改善点を提示（推定）
- scripts/: 不要（推定）
- references/: 不要（推定）
- assets/: 不要（推定）

この内容でSkillを生成してよろしいですか？修正が必要な項目があればお知らせください。
```

## 出力例

### 生成されるSKILL.mdのサンプル（簡潔なSkillの例）

以下は `code-review-helper` Skillとして生成されるSKILL.mdの例である。

```yaml
---
name: "code-review-helper"
description: >
  コードレビューを自動化するSkill。変更差分を分析し、バグの可能性、改善点、
  ベストプラクティスへの準拠状況を提示する。
  使用タイミング: ユーザーがコードレビューを依頼したい場合に使用する。
  トリガーキーワード（日本語）: レビューして、コードレビュー。
  トリガーキーワード（英語）: Review code, Code review。
metadata:
  version: "1.0"
  author: "developer"
---

# Code Review Helper

## 概要
コードの変更差分を分析し、バグの可能性や改善点を自動的に提示するSkillである。

## ワークフロー
### ステップ1: 対象ファイルの特定
変更されたファイルの一覧を取得する。

### ステップ2: 差分分析
各ファイルの変更差分を分析し、問題点を検出する。

### ステップ3: レビュー結果の提示
検出した問題点と改善提案をユーザーに提示する。

## ルール
1. レビュー対象はユーザーが指定したファイルまたは変更差分とする
2. 指摘事項には重要度（高・中・低）を付与する
3. 改善提案には具体的なコード例を含める

## 出力フォーマット
レビュー結果は以下の形式で出力する:
- ファイル名、行番号、重要度、指摘内容、改善提案

## ガイドライン
- 主観的なスタイルの指摘よりも、バグや論理エラーの検出を優先する
```

## エッジケース

### Skill名違反時の自動変換例

| 入力値 | 変換結果 | 適用ルール |
|---|---|---|
| `My Cool Skill!` | `my-cool-skill` | 大文字→小文字、スペース→ハイフン、記号除去 |
| `__test__skill__` | `test-skill` | アンダースコア→ハイフン、先頭・末尾ハイフン除去 |
| `UPPER-CASE-NAME` | `upper-case-name` | 大文字→小文字 |
| `skill   with   spaces` | `skill-with-spaces` | 連続スペース→単一ハイフン |
| `a-very-long-skill-name-that-exceeds-the-sixty-four-character-limit-for-validation` | `a-very-long-skill-name-that-exceeds-the-sixty-four-character-li` | 64文字で切り詰め |
| `-leading-hyphen` | `leading-hyphen` | 先頭ハイフン除去 |
| `trailing-hyphen-` | `trailing-hyphen` | 末尾ハイフン除去 |

### 500行超過時の分割例

SKILL.md本文が500行を超える場合、以下のように分割する。

**分割前（500行超過）:**

SKILL.md内に詳細なAPIリファレンスやガイドが含まれ、全体で600行になっている状態。

**分割後:**

```
my-skill/
├── SKILL.md              （300行 - 要約のみ）
├── references/
│   ├── api-reference.md   （APIリファレンスの詳細）
│   └── setup-guide.md     （セットアップ手順の詳細）
```

SKILL.md内での参照方法:

```markdown
## APIリファレンス
主要なAPIの概要は以下の通り。詳細は `references/api-reference.md` を参照。

## セットアップガイド
基本的なセットアップ手順の概要。詳細は `references/setup-guide.md` を参照。
```

ポイント:
- SKILL.md本文には各トピックの要約のみを残す
- 詳細な内容は `references/` 配下の個別ファイルに分離する
- 参照は相対パスで記述し、1階層以内に制限する
- 分離後のSKILL.mdが500行以下であることを確認する
