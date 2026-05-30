import { TestBed } from '@angular/core/testing';
import fc from 'fast-check';

import { MenuService } from './menu.service';

describe('MenuService', () => {
  let service: MenuService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MenuService);
  });

  it('toggleで開閉状態を反転し、closeで常に閉じる', () => {
    fc.assert(
      fc.property(fc.array(fc.constantFrom<'toggle' | 'close'>('toggle', 'close')), (operations) => {
        service.close();
        let expected = false;

        for (const operation of operations) {
          if (operation === 'toggle') {
            service.toggle();
            expected = !expected;
          } else {
            service.close();
            expected = false;
          }

          expect(service.isOpen()).toBe(expected);
        }
      }),
      { numRuns: 100 }
    );
  });
});
