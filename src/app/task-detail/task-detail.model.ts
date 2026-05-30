export type TaskType = 'TODO' | 'SCHEDULE';
export type TaskStatus = 'incomplete' | 'complete';
export type TaskPriority = 'none' | 'priority' | 'highest';
export type TaskContentField = 'pre_info' | 'notes' | 'reflection';

export interface TaskContent {
  task_id: string;
  pre_info: string | null;
  notes: string | null;
  reflection: string | null;
}

export interface TaskDetail {
  id: string;
  parent_id: string | null;
  task_name: string;
  task_type: TaskType;
  status: TaskStatus;
  progress: number | null;
  priority: TaskPriority;
  sort_order: number;
  event_at: string | null;
  estimated_time: number | null;
  actual_time: number | null;
  preview: string | null;
  detail_flag: boolean;
  export_flag: boolean;
  last_done_at: string | null;
  created_at: string;
  updated_at: string;
  children: TaskDetail[];
  task_contents?: TaskContent | null;
}

export interface TaskUpdateResult {
  type: 'updated' | 'completed' | 'confirmation_required';
  task: TaskDetail | null;
  pending_children?: { id: string; task_name: string; status: TaskStatus }[] | null;
}

export interface RevertResult {
  confirmed: boolean;
  progress?: number;
}
