---
name: "implementation-orchestrator"
description: >
  tasks.md 作成後の実装フェーズを Kiro が司令塔として進める。
  Codex CLI non-interactive mode に実装・修正・テスト・PR 更新を任せ、
  Claude Code に実装 PR のレビューと再確認を任せる。
  Claude Code が承認可能と判定した後は人間の動作確認待ちで停止する。
metadata:
  version: "1.0"
  author: "kiro"
---

# 実装フェーズオーケストレーター

このスキルは、spec PR がマージされ、`.kiro/specs/<spec名>/tasks.md` が作成された後に使用する。spec 作成、`tasks.md` 作成、spec レビューは対象外とし、実装フェーズだけを自動化する。

## 基本方針

- Kiro は司令塔として、対象 spec の確認、Codex CLI と Claude Code の呼び出し、結果の要約、停止判断を担う
- Codex は実装、レビュー指摘対応、テスト、コミット、PR 作成・更新、レビュー返信に集中する
- Claude Code は spec 整合性、コード品質、レビュー指摘対応の妥当性確認に集中する
- Codex と Claude Code を直接会話させず、GitHub PR、インラインレビューコメント、レビュー返信、テスト結果、status JSON など明示的な成果物を介して連携させる
- Claude Code の `承認可能` 判定は「人間の動作確認へ進めてよい」という意味であり、「即マージ可」ではない

## 開始条件

ユーザーは次の形式で依頼する:

```text
#implementation-orchestrator 以下の spec の実装フェーズを開始してください:
- `.kiro/specs/<spec名>/`
```

開始時に確認すること:

1. `docs/CONTRIBUTING.md` の「実装フェーズの自動化方針」を読む
2. `.kiro/steering/development-rules.md` を読む
3. `.agents/github-rules.md` を読む
4. 対象 spec の `requirements.md`、`design.md`、`tasks.md` が存在することを確認する
5. `git status --short` で未コミット変更を確認する
6. 未コミット変更があり、実装フェーズと無関係なら停止して人間に扱いを確認する

## Codex CLI 呼び出し

Codex CLI は non-interactive mode で呼び出す。Kiro は prompt を `${TMPDIR:-/tmp}/nestodo-codex-prompt.txt` などの一時ファイルに保存し、リポジトリルートで次を実行する。

```bash
command -v codex
codex exec --cd "$(pwd)" --sandbox workspace-write -c 'sandbox_workspace_write.network_access=true' --json -o "${TMPDIR:-/tmp}/nestodo-codex-last-message.txt" - < "${TMPDIR:-/tmp}/nestodo-codex-prompt.txt"
```

`command -v codex` で Codex CLI が PATH 上にあることを確認する。`--sandbox workspace-write` は実装・テスト・PR 更新に必要なファイル編集を許可するために使う。Codex の `workspace-write` sandbox は既定ではネットワークアクセスを許可しないため、`gh pr create` や `git push` を行う実装フェーズでは `-c 'sandbox_workspace_write.network_access=true'` を指定する。このネットワーク許可は GitHub PR 操作に必要な `gh` と `git push` を意図したものであり、任意の外部通信を行わせる目的ではない。ただし Codex sandbox は通信先をこの粒度で制限できないため、ネットワーク許可が認められない環境では Codex は実装とローカル検証までを行い、PR 作成・push は停止理由として人間へ提示する。権限不足、外部サービス認証、ネットワーク許可不可、Codex CLI 不在が発生した場合は自動継続せず、人間へ判断材料を提示する。

初回実装 prompt:

```text
$task-implementer 以下の spec について tasks.md のタスクを実装してください:
- `.kiro/specs/<spec名>/`

実装後、必要なテストを実行し、実装 PR を作成または更新してください。
PR 作成・更新、レビューコメント運用、署名はリポジトリのルールに従ってください。
最終出力には、実装 PR 番号または URL と、対応する Issue 番号を含めてください。
```

レビュー指摘対応 prompt:

```text
$task-implementer 実装 PR #<PR番号> のレビュー指摘に対応してください。

Claude Code の未解決レビュー指摘を確認し、各指摘を spec と既存コードに照らして評価してください。
妥当な指摘は修正し、必要なテストを実行し、同じ PR を更新してください。
対応しない指摘には理由と根拠を返信してください。
Codex 自身でレビュー指摘スレッドを解決しないでください。
最終出力には、更新した実装 PR 番号または URL と、対応する Issue 番号を含めてください。
```

Codex の出力から少なくとも次を抽出する:

- PR 番号または PR URL
- Issue 番号
- 変更概要
- 実行したテストと結果
- 未検証範囲
- Codex が停止を求めた理由

Codex の最終出力に Issue 番号が含まれない場合、Kiro は実装 PR 本文、リンクされた Issue、PR コメントから対応 Issue を確認する。PR 上の情報から一意に確認できる場合は自動ループを継続してよい。一意に確認できない場合だけ、「PR の head branch、対象 spec、Issue の対応関係が不明」として停止する。

## Claude Code 呼び出し

Claude Code は print mode で呼び出す。Kiro は prompt を `${TMPDIR:-/tmp}/nestodo-claude-prompt.txt` などの一時ファイルに保存し、リポジトリルートで次を実行する。

```bash
claude -p --permission-mode auto --output-format json "$(cat "${TMPDIR:-/tmp}/nestodo-claude-prompt.txt")" > "${TMPDIR:-/tmp}/nestodo-claude-result.json"
```

`--permission-mode auto` はレビューに必要な読み取り、`gh` CLI、レビューコメント投稿を Claude Code の権限判断に委ねるために使う。初回レビューでは spec、差分、インライン投稿、総括投稿で turn 数が増えやすいため、既定では `--max-turns` を指定しない。Kiro は `--max-turns` の代わりに実行時間、出力サイズ、プロセス終了状態を監視し、異常に長い実行や過大な出力を検出した場合はタイムアウトとして打ち切り、人間へ判断材料を提示する。認証、権限、外部サービス確認で停止した場合は自動継続しない。

初回レビュー prompt:

```text
/spec-impl-checker コード PR #<PR番号> をレビューしてください。
```

再確認 prompt:

```text
/spec-impl-checker 実装 PR #<PR番号> のレビュー指摘対応を再確認してください。
```

Claude Code の出力と PR 上のレビュー状態から、次を確認する:

- 指摘事項の有無
- 未解決スレッドの有無
- テスト・検証上の懸念
- 結論が `承認可能` / `修正後に再確認` / `ブロックあり` のいずれかであること
- `承認可能` が「人間の動作確認へ進めてよい」意味で扱われていること

## ループ継続条件

次のすべてを満たす場合は、Codex 修正と Claude Code 再確認を継続する:

- Claude Code が `承認可能` と判定していない
- 未解決の指摘または再確認依頼が残っている
- 指摘が spec の範囲内で対応可能である
- Codex の前回出力と今回出力に実質的な進捗がある
- テスト失敗やツール失敗の原因が変化している、または解決に向けた新しい情報が増えている
- 人間判断が必要な外部要因に到達していない

固定の回数制限は設けない。

## 停止条件

次のいずれかに該当した場合は自動ループを停止し、人間へ判断材料を提示する:

- 同一原因で進捗がない
- Codex が実質的に同じ修正を繰り返している
- テスト失敗が同じ原因で続いている
- spec の不足・曖昧さ・矛盾が原因で実装判断できない
- 認証、外部サービス、データ確認など人間判断が必要
- 外部環境やツール不調で自動継続できない
- Codex がスコープ外の仕様変更を必要と判断した
- PR の head branch、対象 spec、Issue の対応関係が不明になった

停止時は次を報告する:

- 対象 spec
- 実装 PR
- 最後に成功した工程
- 未解決の指摘または失敗
- 同一原因と判断した根拠
- 人間に判断してほしい選択肢

## `承認可能` 判定後の扱い

Claude Code が `承認可能` と判定したら、Kiro は「人間の動作確認待ち」として停止する。マージしてよいとは報告しない。

報告には次を含める:

- 対象 spec
- 実装 PR
- Codex が実行したテスト
- Claude Code の結論
- 人間が動作確認すべき観点
- 動作確認 OK の場合は人間がマージ判断すること
- 動作確認 NG の場合の分岐
- 実装 PR マージ後に Kiro へ渡す次のプロンプト

すべてのタスクが完了した最終実装 PR の場合、報告には次の `#spec-completion` プロンプトを実際の spec、実装 PR 番号、Issue 番号で埋めて含める。このプロンプトは人間が動作確認 OK と判断し、実装 PR をマージした後にだけ使用するものとして明記する。マージ前に spec 完了処理へ進めてはならない。

```text
#spec-completion 以下の実装 PR がマージされたので spec 完了処理と Issue のクローズをしてください:
- `.kiro/specs/<spec名>/`
実装 PR: #<PR番号>
Issue: #<Issue番号>
```

チェックポイント PR など、まだ `tasks.md` に残タスクがある実装 PR の場合、`#spec-completion` プロンプトは出力しない。代わりに、人間が動作確認 OK と判断してチェックポイント PR をマージした後に、同じ spec でこのスキルを再開するための `#implementation-orchestrator` プロンプトを含める。

```text
#implementation-orchestrator 以下の spec の実装フェーズを再開してください:
- `.kiro/specs/<spec名>/`

チェックポイント実装 PR #<PR番号> はマージ済みです。
最新の tasks.md、マージ済み PR、現在のブランチ状態から残タスクを確認して続行してください。
```

## 人間の動作確認後の分岐

- 動作確認 OK: 人間が最終レビューとマージ可否を判断する
- 動作確認 NG で spec 通りに直せばよい: このスキルで Codex 修正ループを再開する
- 動作確認 NG で spec 自体の更新が必要: 実装フェーズを停止し、変更単位として新しい Issue を作成してから Kiro の spec 更新フローへ戻す。spec 更新にかかる編集は Kiro が担当する

## 複数チェックポイント PR の扱い

`tasks.md` にチェックポイントがあり、Codex が途中成果として実装 PR を作成した場合は、その PR ごとに Claude Code レビュー、Codex 指摘対応、Claude Code 再確認、人間の動作確認を行う。

チェックポイント PR が人間の判断でマージされたら、Kiro は同じ対象 spec でこのスキルを再開し、Codex に残タスクの実装を依頼する。deterministic script 未導入の段階では、前回の status JSON や iteration 情報を必須の引き継ぎ元にせず、最新の `tasks.md`、マージ済み PR、現在のブランチ状態、未完了タスクから状況を再構築する。前回の status JSON が残っている場合は補助情報として参照してよいが、GitHub PR と `tasks.md` の現在状態を正とする。次の Codex 呼び出しでは、マージ済みチェックポイントと `tasks.md` の残タスクを確認するよう prompt に明記する。

すべてのタスクが完了した最後の実装 PR がマージされるまで、Kiro は実行対象としての `#spec-completion` を案内しない。最終実装 PR の `承認可能` 報告に含める `#spec-completion` プロンプトは、マージ後に使う再入口の事前提示であり、マージ前の実行指示ではない。

## deterministic script の追加案

Kiro の状態管理が複雑になった場合は、`scripts/implementation-orchestrator.*` を追加して次を deterministic に処理する:

- 入力: 対象 spec、PR 番号、前回 status JSON、Codex 出力、Claude Code 出力
- 出力: `continue` / `wait_for_human` / `human_verification` の判定、理由、次に呼ぶ prompt
- 記録: PR 番号、iteration、テスト結果、未解決指摘、同一失敗ハッシュ、同一修正ハッシュ

script は判断材料を構造化するだけにし、spec の解釈、実装判断、レビュー判断は Codex と Claude Code の担当範囲を侵食しない。
