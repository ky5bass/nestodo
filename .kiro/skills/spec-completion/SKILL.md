---
name: "spec-completion"
description: >
  実装PRマージ後のバージョン付与・spec-index更新・tasks.md削除・Issueクローズの完了処理を実行する。
  使用タイミング: ユーザーが実装PRマージ後にspec完了処理を依頼した場合に使用する。
  トリガーキーワード（日本語）: spec完了処理, spec完了, spec-completion, 完了処理をお願いします。
  トリガーキーワード（英語）: spec completion, complete spec。
metadata:
  version: "1.0"
  author: "kiro"
---

# spec 完了処理

ユーザーから、対象 spec・実装 PR・Issue を指定して「実装が完了しました。spec 完了処理をお願いします。」と依頼された場合、以下の手順を実行する。

## 実行手順

1. **GitHub 操作ガイドの確認**
   - `#github-operations` steering を参照する

2. **対象の確認**
   - 指定された実装 PR の本文に、対象 spec と Issue が記載されていることを確認する
   - 依頼で指定された対象 spec・Issue と実装 PR 本文の記載が一致しない場合は、ユーザーに報告して処理を中断する
   - 対象を一意に特定できない場合は推測で Issue をクローズしない

3. **実装 PR マージ済みの確認**
   - 指定された実装 PR がマージ済みであることを確認する
   - マージされていない場合は、ユーザーに報告して処理を中断する
   - ユーザーの文面だけでマージ済みとみなさず、GitHub 上の PR 状態で確認する

4. **main の最新化**
   - `git status --short` で未コミット変更がないことを確認する
   - 未コミット変更がある場合は作業を止め、ユーザーに扱いを確認する
   - `git switch main` で `main` ブランチに切り替える
   - `git pull --ff-only` で `main` を最新化し、マージ済みの実装 PR が取り込まれていることを確認する

5. **整合性レビュー完了の確認**
   - Claude Code による spec と実装の整合性レビューが完了していることを確認する
   - レビューが未完了の場合はユーザーに報告し、処理を中断する

6. **バージョン番号の付与**
   - `requirements.md` と `design.md` にバージョン番号を付与する
   - 初回: `v1.0`
   - 更新時: マイナーバージョンをインクリメント（例: `v1.0` → `v1.1`）

7. **spec 一覧の更新**
   - `docs/spec-index.md` の spec 一覧を更新する

8. **tasks.md の削除**
   - `git ls-files --error-unmatch .kiro/specs/<spec名>/tasks.md` で `tasks.md` が Git 管理対象か確認する
   - Git 管理対象であれば `git rm .kiro/specs/<spec名>/tasks.md` で削除する
   - Git 未追跡であれば `rm .kiro/specs/<spec名>/tasks.md` で削除する
   - `tasks.md` が存在しない場合は、対象 spec と実装 PR が正しいか確認し、理由を報告する

9. **spec 完了変更のコミット**
   - バージョン付与、`docs/spec-index.md` 更新、`tasks.md` 削除をステージしてコミットする
   - Issue への操作報告コメントに記載するため、コミット SHA を取得する
   - `git push origin main` で spec 完了コミットをリモートの `main` に反映する
   - push に失敗した場合は Issue をクローズせず、失敗理由をユーザーに報告して処理を中断する

10. **Issue のクローズ**
   - ここまでの処理がすべて成功した場合に限り、対象の Issue に操作報告コメントを投稿してからクローズする
   - コメントには対象 spec（バージョン）、実装 PR、spec 完了コミットを記載する
   - Issue がクローズされたことを確認する

## 注意事項

- すべての手順を順番に実行し、途中でエラーが発生した場合はユーザーに報告する
- spec PR のマージ時点では Issue をクローズしない
- 実装 PR に `Closes`、`Fixes`、`Resolves` などの自動クローズキーワードを記載しない
- 実装 PR がマージされていない場合や、対象 spec・Issue が一致しない場合は Issue をクローズしない
