import { TaskDetail } from '../task-detail/task-detail.model';

export interface TaskTreeNode extends TaskDetail {
  children: TaskTreeNode[];
}
