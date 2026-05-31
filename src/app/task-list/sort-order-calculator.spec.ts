import * as fc from 'fast-check';

import { SortOrderCalculator } from './sort-order-calculator';

describe('SortOrderCalculator', () => {
  it('Property 1: sort_order中間値算出', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -100000, max: 100000, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0.01, max: 100000, noNaN: true, noDefaultInfinity: true }),
        (prev, gap) => {
          const next = prev + Math.abs(gap);
          const midpoint = SortOrderCalculator.midpoint(prev, next);
          expect(midpoint).toBeGreaterThan(prev);
          expect(midpoint).toBeLessThan(next);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 2: sort_order境界値算出', () => {
    fc.assert(
      fc.property(fc.double({ min: -100000, max: 100000, noNaN: true }), (value) => {
        expect(SortOrderCalculator.prependToHead(value)).toBeLessThan(value);
        expect(SortOrderCalculator.appendToEnd(value)).toBeGreaterThan(value);
      }),
      { numRuns: 100 }
    );
  });

  it('Property 3: リバランスの順序保存と等間隔性', () => {
    fc.assert(
      fc.property(
        fc.array(fc.uuid(), { minLength: 1, maxLength: 20 }).filter((ids) => new Set(ids).size === ids.length),
        (ids) => {
          const siblings = ids.map((id, index) => ({ id, sort_order: index + 0.0001 }));
          const rebalanced = SortOrderCalculator.rebalance(siblings);

          expect(rebalanced.map((item) => item.id)).toEqual(ids);
          rebalanced.forEach((item, index) => {
            expect(item.sort_order).toBe(index + 1);
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});
