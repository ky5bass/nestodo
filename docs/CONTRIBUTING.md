# 開発フロー

## 基本的な考え方

- **spec が唯一の情報源**: 機能の仕様・設計は `.kiro/specs/<spec名>/` 配下に集約する
- **spec PR とコード PR を分ける**: 仕様合意とコード実装を別々にレビューする
- **定型作業は hook で自動化**: Kiro の hook を活用して繰り返し作業を排除する
- **spec は簡潔に保つ**: 各ファイルは 100〜150 行以内。肥大化したら分割する

---

## 1機能の開発フロー

```
Issue 作成 → spec 更新 → spec PR → tasks.md 作成 → 実装 → 実装 PR → spec 完了処理 → Wiki 同期
```

### ステップ詳細

#### 1. Issue 作成
**担当: 人間**

新機能・変更の起点。以下を記載する:

- 機能の目的・背景
- 対象の spec（既存 spec の変更か、新規 spec か）

新規 spec の場合は先に Issue を作成し、Kiro に「この Issue に対応する spec を作成してください」と依頼する。どの spec に属するか判断できない場合も、まず Issue を作成して Kiro に相談する。

#### 2. spec 更新
**担当: Kiro**

Kiro に以下のように依頼する:

```
Issue #XX を確認して、.kiro/specs/<spec名>/requirements.md と design.md を更新してください。
```

- `requirements.md` のメタ情報に GitHub Issue URL を記載する（`development-rules.md` のルール）
- `design.md` には「〜という考えから〜とした」形式で設計判断の理由を記載する
- 各ファイルは 150 行以内に収める

#### 3. spec の PR
**担当: 人間（レビュー）・Kiro（作成補助）・Claude Code（任意：品質チェック）**

spec 変更のみを含む PR を作成してマージする。コードはこの PR に含めない。

人間がレビューする前に Claude Code へ以下を依頼すると、ルール準拠や記述品質の確認を行ってくれる:

```
.kiro/specs/<spec名>/ の requirements.md と design.md をレビューしてください。
development-rules.md のルール（行数・設計理由の明記など）に沿っているか確認してください。
```

**PR を分ける理由**: 仕様の合意とコードの実装を分離することで、レビュアーが「仕様は正しいか」と「実装は正しいか」を独立して判断できる。spec の修正コストはコードより圧倒的に低いため、実装前に合意を取ることが重要。また、spec を先にマージしておくと Codex が正確な spec に基づいて実装できる。

#### 4. tasks.md 作成
**担当: Kiro**

spec PR マージ後、Kiro に依頼する:

```
.kiro/specs/<spec名>/tasks.md を作成してください。
```

tasks.md は Codex が実装を進めるためのタスクリスト。実装完了後は Kiro の spec 完了処理で削除される。

#### 5. 実装
**担当: Codex**

Codex に依頼する:

```
.kiro/specs/<spec名>/tasks.md のタスクを実装してください。
```

Codex は `tasks.md` → `design.md` → `requirements.md` の順に参照して実装し、完了後に PR を作成する。

#### 6. 実装 PR のレビュー・マージ
**担当: 人間・Claude Code（任意：コード品質・spec 整合性チェック）**

コード変更を含む PR をレビューしてマージする。

人間がレビューする前に Claude Code へ以下を依頼すると、セキュリティ・エラーハンドリング・堅牢性に加えて、spec と実装の整合性を事前確認できる:

```
PR #XX のコードをレビューしてください。
セキュリティ上の問題・エラーハンドリングの漏れ・spec と実装の不整合がないかを確認してください。
```

Claude Code が確認する観点:

- `requirements.md` の受け入れ基準が実装・テストで満たされているか
- `design.md` の設計判断・インターフェース・データ構造と実装が一致しているか
- `tasks.md` のタスクが実装済みかつテスト済みか
- セキュリティ・エラーハンドリング・堅牢性に問題がないか

#### 7. spec 完了処理
**担当: Kiro**

実装 PR マージ後、Kiro に依頼する:

```
<spec名> の実装が完了しました。spec 完了処理をお願いします。
```

Kiro が行う処理:

- Claude Code による spec と実装の整合性レビューが完了していることの確認
- `requirements.md` と `design.md` にバージョン番号を付与（初回: v1.0、更新時: v1.0 → v1.1）
- `docs/requirements-spec.md` の spec 一覧を更新
- `tasks.md` の削除

#### 8. Wiki 同期
**担当: 自動（GitHub Actions）**

`docs/` 配下の変更が main ブランチにマージされると、GitHub Wiki に自動同期される。

---

## GitHub Issues の使い方

- **変更の大小にかかわらず、つねに新しい Issue を作成する**。既存 Issue へのコメントで仕様変更を進めない
  - 理由: 変更の単位を明確にし、「いつ・なぜ仕様が変わったか」を Issue/PR で追跡できるようにするため
- Issue には対象の spec を明記する（`feature.yml` のドロップダウンで選択）。複数 spec にまたがる場合は分割を検討する
- 「どの spec に属するかわからない」場合は新しい Issue を作成して Kiro に相談する
- sub-issue は使わない（管理が複雑になるため）
- `requirements.md` のメタ情報セクションの Issue URL は、**その時点の spec 内容に対応した最新の Issue URL** を記載する。spec 更新のたびに書き換える
- spec 初回定義の Issue（spec PR マージ後）は close する。以降の変更はつど新しい Issue を立てる

---

## 各ツールの Tips

### Kiro
- spec ファイルの生成・更新が得意。自然言語で要求を伝えるだけでよい
- `.kiro/steering/development-rules.md` を常に参照して動作するため、ルール違反を自動で防いでくれる
- hook を設定しておくと spec 完了処理などの定型作業を自動実行できる
- spec に疑問がある場合は設計の背景（design.md の「〜という考えから」箇所）を参照するよう指示する

### Codex
- `tasks.md` が存在する状態で依頼すると、タスクを順番に実装してくれる
- 実装中に仕様の疑問が生じた場合は `design.md`・`requirements.md` を参照するよう指示する
- ブランチ作成・コミット・PR 作成まで自動で行う
- spec に記載のない抽象化や機能を勝手に追加しない設定になっている

### Claude Code
- **いつ使う**: ステップ3（spec の品質チェック）とステップ6（コード品質・spec 整合性のレビュー補助）。必須ではなく任意
- **spec チェック**: `development-rules.md` のルール準拠・設計理由の記述品質・行数制限の確認が得意
- **コードレビュー**: spec と実装の整合性、セキュリティ・エラーハンドリング・堅牢性など、Codex が見落としがちな横断的な品質観点を担う
- **開発手法の改善**: ワークフローの非効率・ルールの矛盾・ツール設定の改善案を相談できる。`CONTRIBUTING.md` や `development-rules.md` の改訂もここに依頼する
- **やらないこと**: 機能の実装主導（Codex が担当）・spec 完了処理（Kiro が担当）

### GitHub
- spec PR とコード PR を別々に立てることで、レビューの粒度を保つ
- `docs/` 配下は Wiki に自動同期されるため、外部公開ドキュメントはすべて `docs/` に集約する
- Issue に spec へのリンクを貼っておくと、後から経緯を追いやすくなる
