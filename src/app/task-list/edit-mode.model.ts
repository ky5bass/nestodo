import { TaskType } from '../task-detail/task-detail.model';

export type EditOperation =
  | {
      type: 'rename';
      taskId: string;
      oldName: string;
      newName: string;
    }
  | {
      type: 'create';
      tempId: string;
      name: string;
      parentId: string | null;
      sortOrder: number;
      taskType: TaskType;
      eventAt?: string;
    }
  | {
      type: 'delete';
      taskId: string;
      descendants: string[];
    }
  | {
      type: 'move';
      taskId: string;
      oldParentId: string | null;
      oldSortOrder: number;
      newParentId: string | null;
      newSortOrder: number;
      eventAt?: string;
      rebalanced?: { id: string; sortOrder: number }[];
    };

export interface BatchOperation {
  type: 'rename' | 'create' | 'delete' | 'move';
  task_id?: string;
  name?: string;
  new_parent_id?: string | null;
  sort_order?: number;
  task_type?: TaskType;
  event_at?: string;
  descendants?: string[];
}

export interface DropTarget {
  draggedId: string;
  targetId: string;
  position: 'before' | 'inside' | 'after';
}
