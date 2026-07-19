import { Routes } from '@angular/router';

import { TaskListComponent } from './task-list/task-list.component';
import { TaskListNormalMockComponent } from './ui-mock/task-list-normal-mock.component';

export const routes: Routes = [
  {
    path: 'ui-mock',
    component: TaskListNormalMockComponent
  },
  {
    path: '',
    component: TaskListComponent
  }
];
