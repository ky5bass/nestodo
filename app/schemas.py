from __future__ import annotations

from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models import Priority, TaskStatus, TaskType


class CreateTaskInput(BaseModel):
    task_name: str = Field(min_length=1, max_length=255)
    task_type: TaskType
    sort_order: float
    parent_id: UUID | None = None
    event_at: datetime | None = None


class UpdateTaskInput(BaseModel):
    task_name: str | None = Field(default=None, min_length=1, max_length=255)
    progress: int | None = Field(default=None, ge=0, le=100)
    status: TaskStatus | None = None
    priority: Priority | None = None
    event_at: datetime | None = None
    parent_id: UUID | None = None
    estimated_time: int | None = Field(default=None, ge=0)
    actual_time: int | None = Field(default=None, ge=0)
    sort_order: float | None = None
    task_type: TaskType | None = None
    export_flag: bool | None = None
    update_last_done: bool = True
    tz_offset: int | None = None


class UpsertTaskContentInput(BaseModel):
    pre_info: str | None = None
    notes: str | None = None
    reflection: str | None = None


class TaskContentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    task_id: UUID
    pre_info: str | None
    notes: str | None
    reflection: str | None


class TaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    parent_id: UUID | None
    task_name: str
    task_type: TaskType
    status: TaskStatus
    progress: int | None
    priority: Priority
    sort_order: float
    event_at: datetime | None
    estimated_time: int | None
    actual_time: int | None
    preview: str | None
    detail_flag: bool
    export_flag: bool
    last_done_at: date | None
    created_at: datetime
    updated_at: datetime


class TaskWithChildrenOut(TaskOut):
    children: list[TaskOut] = Field(default_factory=list)
    task_contents: TaskContentOut | None = None


class TaskTreeOut(TaskOut):
    children: list["TaskTreeOut"] = Field(default_factory=list)


class PendingChild(BaseModel):
    id: UUID
    task_name: str
    status: TaskStatus


class UpdateResult(BaseModel):
    type: Literal["updated", "completed", "confirmation_required"]
    task: TaskTreeOut | None = None
    pending_children: list[PendingChild] | None = None


class CompleteResult(BaseModel):
    type: Literal["completed", "confirmation_required"]
    task: TaskTreeOut | None = None
    pending_children: list[PendingChild] | None = None
