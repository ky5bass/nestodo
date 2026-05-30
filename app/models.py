from __future__ import annotations

import enum
import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, SmallInteger, String, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db import Base


class TaskType(str, enum.Enum):
    TODO = "TODO"
    SCHEDULE = "SCHEDULE"


class TaskStatus(str, enum.Enum):
    incomplete = "incomplete"
    complete = "complete"


class Priority(str, enum.Enum):
    none = "none"
    priority = "priority"
    highest = "highest"


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("tasks.id", ondelete="CASCADE"), nullable=True, index=True
    )
    task_name: Mapped[str] = mapped_column(String(255), nullable=False)
    task_type: Mapped[TaskType] = mapped_column(
        SAEnum(TaskType, name="task_type_enum", native_enum=True), nullable=False
    )
    status: Mapped[TaskStatus] = mapped_column(
        SAEnum(TaskStatus, name="task_status_enum", native_enum=True),
        default=TaskStatus.incomplete,
        nullable=False,
    )
    progress: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    priority: Mapped[Priority] = mapped_column(
        SAEnum(Priority, name="priority_enum", native_enum=True),
        default=Priority.none,
        nullable=False,
    )
    sort_order: Mapped[float] = mapped_column(Float, nullable=False)
    event_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=False), nullable=True)
    estimated_time: Mapped[int | None] = mapped_column(Integer, nullable=True)
    actual_time: Mapped[int | None] = mapped_column(Integer, nullable=True)
    preview: Mapped[str | None] = mapped_column(Text, nullable=True)
    detail_flag: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    export_flag: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    last_done_at: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    parent: Mapped[Task | None] = relationship(
        "Task", remote_side=[id], back_populates="children", lazy="selectin"
    )
    children: Mapped[list[Task]] = relationship(
        "Task",
        back_populates="parent",
        cascade="all, delete-orphan",
        passive_deletes=True,
        lazy="selectin",
        order_by="Task.sort_order",
    )
    content: Mapped[TaskContent | None] = relationship(
        "TaskContent",
        back_populates="task",
        cascade="all, delete-orphan",
        passive_deletes=True,
        uselist=False,
        lazy="selectin",
    )


class TaskContent(Base):
    __tablename__ = "task_contents"

    task_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tasks.id", ondelete="CASCADE"), primary_key=True
    )
    pre_info: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    reflection: Mapped[str | None] = mapped_column(Text, nullable=True)

    task: Mapped[Task] = relationship("Task", back_populates="content", lazy="selectin")
