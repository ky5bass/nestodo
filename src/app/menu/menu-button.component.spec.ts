import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { MenuButtonComponent } from './menu-button.component';
import { MenuService } from './menu.service';

describe('MenuButtonComponent', () => {
  let fixture: ComponentFixture<MenuButtonComponent>;
  let service: MenuService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MenuButtonComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(MenuButtonComponent);
    service = TestBed.inject(MenuService);
    service.close();
    fixture.detectChanges();
  });

  it('ハンバーガーアイコンとアクセシビリティ属性を表示する', () => {
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    const lines = fixture.nativeElement.querySelectorAll('.menu-line') as NodeListOf<HTMLElement>;

    expect(lines.length).toBe(3);
    expect(button.getAttribute('aria-label')).toBe('メニュー');
    expect(button.getAttribute('aria-expanded')).toBe('false');
  });

  it('クリックでメニュー状態とaria-expandedを切り替える', () => {
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;

    button.click();
    fixture.detectChanges();

    expect(service.isOpen()).toBeTrue();
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(fixture.nativeElement.querySelector('app-menu-panel')).not.toBeNull();
  });
});
