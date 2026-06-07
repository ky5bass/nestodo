## 種別

- [x] spec 分解 PR（仕様整理のみ・コードなし）

## 対象 spec

- 元 spec:
  - `.kiro/specs/<!-- 元spec名 -->/`
- 分解後の spec:
  - `.kiro/specs/<!-- 分解後spec名 -->/`

## 分解内容

- <!-- 元 spec から各 spec へ移動した責務を記載 -->
- <!-- 元 spec を残した場合は残した責務を記載。削除した場合は削除したことを記載 -->

## 分解対応表

| 元 spec の要素 | 分解後の配置先 | 分解後要素の由来 | 状態 |
| --- | --- | --- | --- |
| `requirements.md` <!-- Requirement名/見出し --> | `.kiro/specs/<!-- spec名 -->/requirements.md` <!-- 見出し --> | 元 spec の <!-- Requirement名/見出し --> | 移動 |
| `design.md` <!-- 見出し/設計判断/インターフェース --> | `.kiro/specs/<!-- spec名 -->/design.md` <!-- 見出し --> | 元 spec の <!-- 見出し/設計判断/インターフェース --> | 移動 |

<!-- 元 spec の requirements.md / design.md に含まれていた要素をすべて列挙し、分解後の各要素が元 spec のどこに由来するかも明記する -->

## 更新した索引

- `docs/spec-index.md`
  - <!-- 分解後 spec、依存 spec、関連 spec、共通領域の更新内容を記載 -->

## 確認事項

- [ ] 変更範囲に不要なファイルが含まれていない
- [ ] コード変更を含めていない
- [ ] `tasks.md` を変更していない
- [ ] `docs/spec-index.md` に分解後の spec を登録している
- [ ] 分解対応表で、元 spec の `requirements.md` / `design.md` の全要素に分解後の配置先を記載している
- [ ] 分解後 spec の全要素について、元 spec のどの要素に由来するか記載している
- [ ] 依存関係・関連 spec・優先適用関係を必要な箇所に明記している
- [ ] 元 spec の `requirements.md` / `design.md` を削除した場合は `git rm` を使っている

## テスト方法

- なし（spec 分解 PR のため）

## 検証

- spec ごとに以下を列挙:
  - `.kiro/specs/<!-- spec名 -->/requirements.md`: <!-- 行数または削除 -->
  - `.kiro/specs/<!-- spec名 -->/design.md`: <!-- 行数または削除 -->
