# Implementation Plan: menu-button

## Overview

タスク一覧画面のヘッダーにハンバーガーメニューボタンとナビゲーションパネルを追加する。MenuServiceで状態管理し、MenuButtonComponent・MenuPanelComponentをスタンドアロンコンポーネントとして実装する。

## Tasks

- [ ] 1. MenuServiceとデータモデルの実装
  - [ ] 1.1 NavItemインターフェースとNAV_ITEMS定数を作成
    - `NavItem`インターフェースと`NAV_ITEMS`定数配列を定義
    - _Requirements: 3.1, 3.2, 3.3, 4.3_
  - [ ] 1.2 MenuServiceを実装
    - `isOpen` signal、`toggle()`、`close()`メソッドを実装
    - _Requirements: 2.1, 2.2, 2.3_
  - [ ]* 1.3 MenuServiceのプロパティテスト
    - **Property 1: メニュー状態遷移の整合性**
    - fast-checkでランダムな操作シーケンスを生成し、toggle/closeの状態整合性を検証
    - **Validates: Requirements 2.1, 2.4, 2.5**

- [ ] 2. MenuButtonComponentの実装
  - [ ] 2.1 MenuButtonComponentを作成
    - ハンバーガーアイコン（三本線）を表示
    - クリックで`MenuService.toggle()`を呼び出し
    - `aria-label="メニュー"`、`aria-expanded`バインディングを設定
    - _Requirements: 1.2, 1.3, 1.4, 2.1, 2.4, 2.5_
  - [ ]* 2.2 MenuButtonComponentのユニットテスト
    - ハンバーガーアイコンのレンダリング確認
    - aria-label、aria-expanded属性の検証
    - _Requirements: 1.2, 1.4, 2.4, 2.5_

- [ ] 3. MenuPanelComponentの実装
  - [ ] 3.1 MenuPanelComponentを作成
    - NAV_ITEMSをリスト形式で表示
    - Escキーで`MenuService.close()`を呼び出し
    - 外部クリック検知で`MenuService.close()`を呼び出し
    - リンククリックで`Router.navigate()` + `MenuService.close()`
    - _Requirements: 2.2, 2.3, 3.1, 3.2, 3.4_
  - [ ]* 3.2 MenuPanelComponentのユニットテスト
    - リンク一覧表示、先頭が「タスク一覧」であること
    - 外部クリック・Escキーによるパネル閉じ
    - リンククリック時のナビゲーション + パネル閉じ
    - _Requirements: 2.2, 2.3, 3.1, 3.4, 4.3_

- [ ] 4. チェックポイント - テスト確認
  - すべてのテストが通ることを確認し、不明点があればユーザーに質問する。

- [ ] 5. ヘッダーへの統合
  - [ ] 5.1 HeaderComponentにMenuButtonComponentを配置
    - TaskListComponentのヘッダー領域にMenuButtonComponentを組み込み
    - MenuPanelComponentの表示/非表示をisOpenで制御
    - _Requirements: 1.1, 4.1, 4.2_
  - [ ]* 5.2 結合テスト
    - TaskListComponent内でのMenuButtonComponent描画確認
    - ルーティング設定の検証
    - _Requirements: 1.1, 4.1_

- [ ] 6. 最終チェックポイント - 全テスト確認
  - すべてのテストが通ることを確認し、不明点があればユーザーに質問する。

## Notes

- `*`付きタスクはオプションであり、MVP優先時はスキップ可能
- 各タスクは対応するRequirementsを参照し、トレーサビリティを確保
- プロパティテストはfast-checkを使用し、状態遷移の整合性を検証

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "2.1"] },
    { "id": 2, "tasks": ["2.2", "3.1"] },
    { "id": 3, "tasks": ["3.2", "5.1"] },
    { "id": 4, "tasks": ["5.2"] }
  ]
}
```
