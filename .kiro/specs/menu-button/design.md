# 設計ドキュメント: menu-button

## Overview

タスク一覧画面のヘッダー領域にハンバーガーメニューボタンを配置し、ナビゲーションパネルの開閉を実現する設計。将来の画面追加に備え、ナビゲーションリンクをデータ駆動で管理する。

**設計判断**: メニュー状態管理を専用のMenuServiceに分離した。TaskListServiceはタスクデータの責務を持つため、メニューUI状態を混在させると単一責任の原則に反するという考えからである。

## Architecture

```
TaskListComponent (Angular)
├── HeaderComponent（ヘッダー領域）
│   └── MenuButtonComponent (メニューボタン)
│       └── MenuPanelComponent (ナビゲーションパネル)
└── TaskRowComponent (既存: ツリー描画)

MenuService (状態管理: Signal)
├── isOpen signal
└── toggle / close メソッド
```

**設計判断**: MenuPanelComponentをMenuButtonComponentの子として配置した。パネルの表示位置がボタンに対して相対的であり、外部クリック検知のスコープを明確にするためである。

**設計判断**: ナビゲーションリンクを定数配列で定義した。現時点ではAPIから取得する必要がなく、画面追加時はコード変更のみで対応できるという考えからである。

## Components and Interfaces

### MenuService (Angular - Frontend)

```typescript
@Injectable({ providedIn: 'root' })
export class MenuService {
  readonly isOpen = signal<boolean>(false);

  toggle(): void;   // isOpenを反転
  close(): void;    // isOpenをfalseに設定
}
```

### MenuButtonComponent (Angular - Frontend)

```typescript
@Component({ selector: 'app-menu-button', standalone: true })
export class MenuButtonComponent {
  // MenuServiceのisOpenを参照し、aria-expandedにバインド
  // クリックでMenuService.toggle()を呼び出し
  // aria-label="メニュー" を設定
}
```

### MenuPanelComponent (Angular - Frontend)

```typescript
@Component({ selector: 'app-menu-panel', standalone: true })
export class MenuPanelComponent {
  readonly navItems: NavItem[] = NAV_ITEMS;
  // @HostListenerでEscキー検知 → MenuService.close()
  // 外部クリック検知 → MenuService.close()
  // リンククリック → Router.navigate() + MenuService.close()
}
```

## Data Models

### ナビゲーションリンク定義

```typescript
interface NavItem {
  label: string;    // 表示テキスト（例: "タスク一覧"）
  path: string;     // ルーターパス（例: "/"）
  icon?: string;    // 将来用: アイコン識別子
}

const NAV_ITEMS: NavItem[] = [
  { label: 'タスク一覧', path: '/' },
  // 将来の画面追加時にここへ追加
];
```

## Correctness Properties

*正しさの性質とは、システムのすべての有効な実行において成り立つべき特性や振る舞いの形式的な記述である。*

### Property 1: メニュー状態遷移の整合性

*任意の*メニュー操作シーケンス（toggle, close）において、toggleはisOpenを反転し、closeは常にfalseにすること。かつ、aria-expanded属性が常にisOpenの値と一致すること。

**Validates: Requirements 2.1, 2.4, 2.5**

## Error Handling

| エラー種別 | 条件 | 対応 |
|---|---|---|
| navigation_error | Router.navigateが失敗 | パネルは閉じ、現在画面を維持 |

メニュー機能はローカル状態のみで動作するため、API通信エラーは発生しない。ナビゲーション失敗時もパネルを閉じてUIの一貫性を保つという考えから、エラー時もclose()を実行する方針とした。

## Testing Strategy

**プロパティテスト**: fast-checkを使用し、Property 1を100回以上検証。ランダムな操作シーケンスを生成し、各操作後の状態整合性を確認する。タグ: `Feature: menu-button, Property 1: メニュー状態遷移の整合性`

**ユニットテスト**: Angular TestBed使用。
- MenuButtonComponentのレンダリング（ハンバーガーアイコン、aria-label）
- MenuPanelComponentのリンク一覧表示（リスト形式、先頭が「タスク一覧」）
- 外部クリックによるパネル閉じ
- Escキーによるパネル閉じ
- リンククリック時のナビゲーション + パネル閉じ

**結合テスト**: TaskListComponent内でのMenuButtonComponent描画確認、ルーティング設定の検証。
