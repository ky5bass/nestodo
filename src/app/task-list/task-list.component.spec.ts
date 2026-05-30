import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { routes } from '../app.routes';
import { TaskListComponent } from './task-list.component';

describe('TaskListComponent', () => {
  it('ヘッダー領域にメニューボタンを表示する', async () => {
    await TestBed.configureTestingModule({
      imports: [TaskListComponent],
      providers: [provideRouter(routes)]
    }).compileComponents();

    const fixture = TestBed.createComponent(TaskListComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-header')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-menu-button')).not.toBeNull();
  });

  it('タスク一覧画面をルートパスに配置する', () => {
    const rootRoute = routes.find((route) => route.path === '');

    expect(rootRoute?.component).toBe(TaskListComponent);
  });
});
