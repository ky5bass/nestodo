# GitHub 操作ガイド

## リポジトリ

`ky5bass/nestodo`

## Issue の作成

```bash
gh issue create --repo ky5bass/nestodo --title "タイトル" --body "説明"
```

## Issue の参照

```bash
# 本文 + コメント取得（コメントが0件でない限り必ずコメントも取得すること）
gh issue view <番号> --repo ky5bass/nestodo --comments --json body,comments

# 一覧
gh issue list --repo ky5bass/nestodo --json number,title,state
```

## Issue へのコメント

```bash
gh issue comment <番号> --repo ky5bass/nestodo --body "コメント本文"
```

## Issue の close

```bash
gh issue close <番号> --repo ky5bass/nestodo
```

## PR 操作

```bash
# PR 作成
gh pr create --repo ky5bass/nestodo --title "タイトル" --body "説明"

# PR 一覧
gh pr list --repo ky5bass/nestodo
```

## ルール

- 書き込み系操作（コメント追加、Issue作成等）はユーザーから明示的に指示された場合のみ実行すること
- コメントに仕様変更や追加要件が含まれている可能性があるため、Issue参照時はコメントを省略しないこと
