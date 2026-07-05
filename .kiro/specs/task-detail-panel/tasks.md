# Implementation Tasks: task-detail-panel v1.3

## 概要

v1.2 → v1.3 の差分実装。TimeInputComponent の0入力対応（スナップバイパス + バリデーション変更）を実装する。

## 前提

- `task-detail-panel` v1.2 は実装済みの想定
- バックエンドは既に `ge=0` で0を許容しているため変更不要

---

## Task 1: snapToNearest に0入力バイパスを追加

- [ ] `src/app/task-detail/time-input.component.ts` の `snapToNearest` 関数を修正し、`input === 0` の場合は離散値配列を参照せず `0` をそのまま返すようにする
- [ ] `stepIndex` メソッドの `value <= 0` 分岐で、`value === 0` の場合にインデックス0を返す既存動作が正しいことを確認する（スライダーを先頭位置に留める）

### 完了条件

- `snapToNearest(0, [5, 10, 15, 20, 30, 45])` が `0` を返す
- `snapToNearest(0, [1, 2, 3, 4, 6])` が `0` を返す
- `snapToNearest(0, [1, 2, 3, 4, 5, 7, 10, 15, 20])` が `0` を返す
- 1以上の入力に対する既存の最近傍スナップ動作が変わらない

---

## Task 2: onText バリデーションを「0以上の整数」に変更

- [ ] `src/app/task-detail/time-input.component.ts` の `onText` メソッド内のバリデーション条件を `value <= 0` から `value < 0` に変更する
- [ ] 0入力時に `errorKey` がセットされず、`updatePart` が呼ばれることを確認する
- [ ] `updatePart` 内で `snapToNearest(0, steps)` が0を返し、totalMinutes の計算に正しく反映されることを確認する

### 完了条件

- テキストボックスに `0` を入力してもバリデーションエラーが表示されない
- テキストボックスに `-1` を入力するとバリデーションエラーが表示される
- テキストボックスに `1.5` を入力するとバリデーションエラーが表示される
- `onText('minutes', '0')` 後の `valueChange` emit が呼ばれ、適切な合計分が出力される

---

## Task 3: テスト修正と Property 2 拡張

- [ ] `src/app/task-detail/time-input.component.spec.ts` の既存テスト「0以下または非整数の入力ではエラーを表示し保存値を通知しない」を修正:
  - テスト名を「負の数または非整数の入力ではエラーを表示し保存値を通知しない」に変更
  - テストケースの入力値を `'0'` から `'-1'` に変更
- [ ] 0入力テストを追加: `onText('minutes', '0')` で `errorKey()` が `null` であり、`valueChange.emit` が呼ばれることを検証
- [ ] Property 2 テストを拡張:
  - `fc.integer({ min: 1, max: 200 })` を `fc.integer({ min: 0, max: 200 })` に変更
  - 0入力時に `snapToNearest(0, steps)` が `0` を返すアサーションを追加
  - テスト内の期待値計算ロジックに0入力ケースの分岐を追加
- [ ] `ng test --watch=false` で全テストがパスすることを確認する

### 完了条件

- 全テストグリーン
- Property 2 が0を含む入力範囲で100回以上パスする
- 0入力の example-based テストがパスする
- 負の数入力の example-based テストがパスする

---

## Task Dependency Graph

```
Task 1 (snapToNearest 修正)
  └── Task 2 (onText バリデーション変更) ── Task 1 に依存
        └── Task 3 (テスト修正・拡張) ── Task 1, 2 に依存
```

Task 1 → Task 2 → Task 3 の順に実装すること。
