# GitHub コマンドリファレンス

## Issue の作成

```bash
gh issue create --repo ky5bass/nestodo --title "タイトル" --body "説明"
```

## Issue の参照

```bash
gh issue view <番号> --repo ky5bass/nestodo --comments --json body,comments
```

## Issue の一覧取得

```bash
gh issue list --repo ky5bass/nestodo --json number,title,state
```

## Issue へのコメント

```bash
gh issue comment <番号> --repo ky5bass/nestodo --body "コメント本文"
```

## Issue のクローズ

```bash
gh issue close <番号> --repo ky5bass/nestodo
```

## PR の作成

```bash
gh pr create --repo ky5bass/nestodo --title "タイトル" --body "説明"
```

## PR の一覧取得

```bash
gh pr list --repo ky5bass/nestodo
```

## PR へのコメント投稿

```bash
gh pr comment <番号> --repo ky5bass/nestodo --body-file <本文ファイル>
```

## PR へのインラインレビューコメント投稿

PR の head commit SHA と、PR 差分上の変更ファイル・変更行を指定する。

```bash
gh api --method POST repos/ky5bass/nestodo/pulls/<番号>/comments \
  -F body=@review-comment.md \
  -f commit_id="<head commit SHA>" \
  -f path="<ファイルパス>" \
  -F line=<変更後の行番号> \
  -f side="RIGHT"
```

`review-comment.md` は投稿するコメント本文を保存した一時ファイルとする。削除行へ投稿する場合は、削除前の行番号と `side="LEFT"` を指定する。インラインコメントは PR の差分に含まれる行にだけ投稿できる。

## PR の head commit SHA 取得

```bash
gh pr view <番号> --repo ky5bass/nestodo --json headRefOid --jq .headRefOid
```

## PR の既存インラインレビューコメント取得

```bash
gh api repos/ky5bass/nestodo/pulls/<番号>/comments --paginate --jq '.[].body'
```

## PR の既存コメント取得

```bash
gh api repos/ky5bass/nestodo/issues/<番号>/comments --paginate --jq '.[].body'
```
