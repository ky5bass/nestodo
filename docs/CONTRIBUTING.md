# 開発フロー

## 基本的な考え方

- **spec が唯一の情報源**: 機能の仕様・設計は `.kiro/specs/<spec名>/` 配下に集約する
- **spec PR とコード PR を分ける**: 仕様合意とコード実装を別々にレビューする
- **定型作業は hook で自動化**: Kiro の hook を活用して繰り返し作業を排除する
- **spec は簡潔に保つ**: 各ファイルは 100〜150 行以内。肥大化したら分割する

## Docker 開発・検証環境

- 開発環境は `compose.yml` を使用し、`docker compose up` で起動する
- 正式なビルド、テスト、リント、型チェックは Docker Compose のテスト専用サービス内で実行する
- テスト専用サービスには `test` profile を付け、通常の開発環境や本番環境では起動しない
- テストは次のコマンドで一時コンテナとして実行する

```bash
docker compose config
docker compose --profile test run --rm backend-test
docker compose --profile test run --rm frontend-test
```

- 本番環境は `compose.prod.yml` のみを使用し、次のコマンドで構成確認・起動する

```bash
docker compose -f compose.prod.yml config
docker compose -f compose.prod.yml up -d --build
```

- ホスト側の `.venv` や `node_modules` はエディター補助などに使用してよいが、正式な検証結果として扱わない
- テスト実行のために開発・本番のデータベースや永続ボリュームを削除・初期化しない

---

## 1機能の開発フロー

```
Issue 作成 → Issue の具体化・承認・記録 → 新しいセッションで spec PR 作成 → spec PR レビュー・マージ → tasks.md 作成 → 実装 PR 作成 → 実装 PR レビュー・マージ → spec 完了処理・Issue クローズ → Wiki 同期
```

### ステップ詳細

#### 1. Issue 作成
**担当: 人間**

新機能・変更の起点。以下を記載する:

- 機能の目的・背景
- 対象の spec（既存 spec の変更か、新規 spec か）

既存 spec の更新の場合であれ、新規 spec の追加の場合であれ、どの spec に属するか判断できない場合であれ、いかなる場合も先に Issue を作成する。

#### 2. Issue の具体化・承認・記録
**担当: Kiro（具体化・記録）・人間（回答・承認）**

Kiro に以下のように依頼する:

```
#spec-clarify-from-issue Issue #XX を具体化してください。
```

Kiro は `.kiro/steering/spec-clarify-from-issue.md` に従い、Issue を対話で具体化して明示的な承認を得た後、承認内容を自己完結した Issue コメントとして記録し、spec を変更せずにセッションを終了する。

#### 3. spec 更新 PR 作成
**担当: Kiro**

人間は新しい Kiro セッションを開始し、次のように依頼する:

```
#spec-update-from-approved-issue Issue #XX を spec に反映してください。
```

Kiro は `.kiro/steering/spec-update-from-approved-issue.md` に従い、過去の会話に頼らず最新の承認済みコメントから spec PR を作成する。

#### 4. spec PR レビュー・マージ
**担当: 人間（レビュー）・Claude Code（任意：品質チェック）**

spec 変更のみを含む PR をレビューしてマージする。

人間がレビューする前に Claude Code へ以下を依頼すると、`/spec-quality-review` スキルでルール準拠や記述品質の確認を行ってくれる:

```
/spec-quality-review

以下の spec PR をレビューしてください。

PR: <PR URL>
Issue: <Issue URL>

対象 spec:
- `.kiro/specs/<spec名>/`
```

**PR を分ける理由**: 仕様の合意とコードの実装を分離することで、レビュアーが「仕様は正しいか」と「実装は正しいか」を独立して判断できる。spec の修正コストはコードより圧倒的に低いため、実装前に合意を取ることが重要。また、spec を先にマージしておくと Codex が正確な spec に基づいて実装できる。

#### 5. tasks.md 作成
**担当: Kiro**

spec PR マージ後、Kiro に以下のように依頼する:

```
以下の spec について tasks.md を作成してください:
- `.kiro/specs/<spec名>/`
```

tasks.md は Codex が実装を進めるためのタスクリスト。実装完了後は Kiro の spec 完了処理で削除される。

#### 6. 実装
**担当: Codex**

Codex に以下のように依頼する:

```
$task-implementer 以下の spec について tasks.md のタスクを実装してください:
- `.kiro/specs/<spec名>/`
```

#### 7. 実装 PR レビュー・マージ
**担当: 人間（レビュー）・Claude Code（任意：コード品質・spec 整合性チェック）**

コード変更を含む PR をレビューしてマージする。

実装 PR の本文には対応する Issue 番号を記載する。ただし、Issue は Kiro の spec 完了処理でクローズするため、`Closes`、`Fixes`、`Resolves` などの自動クローズキーワードは使用しない。

人間がレビューする前に Claude Code の `/spec-impl-checker` スキルを使って、セキュリティ・エラーハンドリング・堅牢性に加えて、spec と実装の整合性を事前確認できる。PR を指定したレビューでは、指摘事項は 1 項目につき 1 件、最後に総括 1 件を PR の通常コメントとして自動投稿する:

```
/spec-impl-checker コード PR #XX をレビューしてください。
```

詳細なレビュー手順は `.claude/skills/spec-impl-checker/SKILL.md` にまとめている。

#### 8. spec 完了処理
**担当: Kiro**

実装 PR マージ後、Kiro に以下のように依頼する:

```
#spec-completion 以下の実装 PR がマージされたので spec 完了処理と Issue のクローズをしてください:
- `.kiro/specs/<spec名>/`
実装 PR: #XX
Issue: #YY
```

Kiro は実装 PR がマージ済みであり、PR 本文の対象 spec・Issue が依頼内容と一致することを確認する。バージョン付与、`docs/spec-index.md` 更新、`tasks.md` 削除がすべて成功した後、最後に Issue をクローズする。

#### 9. Wiki 同期
**担当: 自動（GitHub Actions）**

`docs/` 配下の変更が main ブランチにマージされると、GitHub Wiki に自動同期される。

---

## spec を分解する際のフロー

spec の分解は、実装作業ではなく既存の要件・設計の再配置として扱う。新しい仕様や実装タスクを追加せず、コード変更を含めず、spec 分解 PR でレビューする。

```
spec 分解 PR 作成 → spec 分解 PR レビュー・マージ
```

### ステップ詳細

#### 1. spec 分解 PR 作成
**担当: Kiro**

`requirements.md` または `design.md` が 120 行を超えた場合、Kiro に以下のように依頼する:

```
#spec-split <spec名> を分解してください。
```

詳細な分解手順は `.kiro/steering/spec-split.md` にまとめている。

#### 2. spec 分解 PR レビュー・マージ
**担当: 人間（レビュー）・Claude Code（任意：分解必要十分性レビュー）**

spec 分解 PR をレビューしてマージする。

人間がレビューする前に Claude Code へ以下を依頼すると、`/spec-split-completeness-review` スキルで元 spec と分解後 spec が必要十分に対応しているか確認してくれる:

```
/spec-split-completeness-review

以下の spec 分解 PR をレビューしてください。

PR: <PR URL>

対象 spec:
- `.kiro/specs/<元spec名>/`
- `.kiro/specs/<分解後spec名>/`
```

---

## GitHub Issues の使い方

- Issue は spec に恒久的に紐づくものではなく、個々の変更単位に対して作成する
- **変更の大小にかかわらず、つねに新しい Issue を作成する**。既存 Issue へのコメントで仕様変更を進めない
  - 理由: 変更の単位を明確にし、「いつ・なぜ仕様が変わったか」を Issue/PR で追跡できるようにするため
- 同じ変更単位について、Kiro との対話で具体化して承認された内容は、その Issue のコメントに記録する。これは新たな仕様変更ではなく、Issue 本文を具体化した合意記録として扱う
- 具体化・承認と spec 更新は別の Kiro セッションで行い、spec 更新セッションへ会話内容を引き継がない
- spec 更新時は、Issue 内の最新の `承認済み spec 反映内容` を今回の変更内容の正とする。spec PR マージ後は、従来どおり spec を唯一の情報源とする
- Issue には対象の spec を明記する（`feature.yml` のドロップダウンで選択）。複数 spec にまたがる場合は分割を検討する
- 「どの spec に属するかわからない」場合は対象 spec を未定として（`feature.yml` のドロップダウンで `未定（後で判断）` を選択） Issue を作成する
- sub-issue は使わない（管理が複雑になるため）
- spec PR マージ後も Issue はオープンのまま維持し、実装 PR のマージ後、Kiro の spec 完了処理が成功した時点でクローズする
- 実装 PR では Issue の自動クローズキーワードを使わない。以降の変更はつど新しい Issue を立てる

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
- **いつ使う**: ステップ4（spec の品質チェック）とステップ7（コード品質・spec 整合性のレビュー補助）。必須ではなく任意
- **spec チェック**: `development-rules.md` のルール準拠・設計理由の記述品質・行数制限の確認が得意
- **コードレビュー**: spec と実装の整合性、セキュリティ・エラーハンドリング・堅牢性など、Codex が見落としがちな横断的な品質観点を担う
- **開発手法の改善**: ワークフローの非効率・ルールの矛盾・ツール設定の改善案を相談できる。`CONTRIBUTING.md` や `development-rules.md` の改訂もここに依頼する
- **やらないこと**: 機能の実装主導（Codex が担当）・spec 完了処理（Kiro が担当）

### GitHub
- spec PR とコード PR を別々に立てることで、レビューの粒度を保つ
- `docs/` 配下は Wiki に自動同期されるため、外部公開ドキュメントはすべて `docs/` に集約する
- Issue に spec へのリンクを貼っておくと、後から経緯を追いやすくなる
