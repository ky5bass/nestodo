export interface NavItem {
  label: string;
  path: string;
  icon?: string;
}

export const NAV_ITEMS: readonly NavItem[] = [
  {
    label: 'タスク一覧',
    path: '/'
  }
];
