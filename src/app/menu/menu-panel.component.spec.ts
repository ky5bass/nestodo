import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { MenuPanelComponent } from './menu-panel.component';
import { MenuService } from './menu.service';

describe('MenuPanelComponent', () => {
  let fixture: ComponentFixture<MenuPanelComponent>;
  let service: MenuService;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MenuPanelComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(MenuPanelComponent);
    service = TestBed.inject(MenuService);
    router = TestBed.inject(Router);
    service.toggle();
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('ナビゲーションリンクをリスト形式で表示し、先頭にタスク一覧を置く', () => {
    const list = fixture.nativeElement.querySelector('ul') as HTMLUListElement;
    const links = fixture.nativeElement.querySelectorAll('a') as NodeListOf<HTMLAnchorElement>;

    expect(list).not.toBeNull();
    expect(links.length).toBe(1);
    expect(links[0].textContent?.trim()).toBe('タスク一覧');
    expect(links[0].getAttribute('href')).toBe('/');
  });

  it('Escキーでパネルを閉じる', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(service.isOpen()).toBeFalse();
  });

  it('外部クリックでパネルを閉じる', () => {
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(service.isOpen()).toBeFalse();
  });

  it('リンククリック時に遷移してパネルを閉じる', fakeAsync(() => {
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
    const link = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;

    link.click();
    tick();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
    expect(service.isOpen()).toBeFalse();
  }));
});
