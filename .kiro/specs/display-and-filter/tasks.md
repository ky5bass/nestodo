# Implementation Tasks: display-and-filter v1.3

## 概要

v1.2 → v1.3 の差分実装。TaskRowComponent の `formatMinutes` に対する Property 9（0値・null値の区別）のプロパティテストを追加する。

## 前提

- `display-and-filter` v1.2 は実装済みの想定
- `formatMinutes` の実装自体は v1.2 時点で既に0値=`0m`、null=`-` の挙動を満たしている
- v1.3 で追加されたのは明示的な受け入れ基準 (AC3) と Property 9 のテスト

---

## Task 1: formatMinutes の Property 9 プロパティテストを追加

- [ ] `src/app/task-list/task-row.component.spec.ts` に Property 9 テストを追加する:
  - `fast-check` を使用し、`fc.oneof(fc.constant(null), fc.integer({ min: 0, max: 10000 }))` で入力を生成
  - 入力が `null` の場合、戻り値が `-` であることを検証
  - 入力が `0` の場合、戻り値が `0m` であることを検証
  - 入力が `0` の場合の戻り値と `null` の場合の戻り値が異なることを検証
  - 100回以上のランダム入力で実行
- [ ] 0値の example-based テストを追加: `formatMinutes(0)` が `'0m'` を返すことを検証
- [ ] null値の example-based テストを追加: `formatMinutes(null)` が `'-'` を返すことを検証
- [ ] `ng test --watch=false` で全テストがパスすることを確認する

### 完了条件

- Property 9 が100回以上のランダム入力でパスする
- 0値とnull値の区別が明示的にテストされている
- 全テストグリーン

---

## Task Dependency Graph

```
Task 1 (formatMinutes Property 9 テスト追加) ── 依存なし
```

単一タスクのため、依存関係はない。ただし、`task-detail-panel` v1.3 のタスクとは独立して実装可能。
