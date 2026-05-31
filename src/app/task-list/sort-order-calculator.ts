export interface SortableSibling {
  id: string;
  sort_order: number;
}

export class SortOrderCalculator {
  static readonly minGap = 0.001;

  static midpoint(prev: number, next: number): number {
    return (prev + next) / 2;
  }

  static appendToEnd(last: number): number {
    return last + 1.0;
  }

  static prependToHead(first: number): number {
    return first - 1.0;
  }

  static needsRebalance(prev: number, next: number): boolean {
    return next - prev < this.minGap;
  }

  static rebalance<T extends SortableSibling>(siblings: T[]): T[] {
    return siblings
      .slice()
      .sort((left, right) => left.sort_order - right.sort_order)
      .map((sibling, index) => ({ ...sibling, sort_order: index + 1.0 }));
  }
}
