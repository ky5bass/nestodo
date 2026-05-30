from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.errors import (
    HierarchyLimitError,
    InvalidTimezoneOffsetError,
    NotFoundError,
    RootEventAtRequiredError,
    StatusConflictError,
    TransactionError,
    ValidationAppError,
)
from app.models import Priority, Task, TaskStatus
from app.repositories import TaskRepository
from app.schemas import (
    CompleteResult,
    CreateTaskInput,
    PendingChild,
    TaskContentOut,
    TaskOut,
    TaskTreeOut,
    TaskWithChildrenOut,
    UpdateResult,
    UpdateTaskInput,
    UpsertTaskContentInput,
)

MAX_DEPTH = 10
DAY_BOUNDARY_HOUR = 5


class TaskService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repo = TaskRepository(session)

    async def create(self, input: CreateTaskInput) -> TaskOut:
        if input.parent_id is None and input.event_at is None:
            raise RootEventAtRequiredError()
        if input.parent_id is not None:
            parent = await self.repo.get(input.parent_id)
            if parent is None:
                raise NotFoundError("親タスクが見つかりません", {"id": str(input.parent_id)})
            await self._ensure_depth_allowed(input.parent_id)

        task = Task(
            parent_id=input.parent_id,
            task_name=input.task_name,
            task_type=input.task_type,
            sort_order=input.sort_order,
            event_at=input.event_at,
            status=TaskStatus.incomplete,
            progress=None,
            priority=Priority.none,
            estimated_time=None,
            actual_time=None,
            preview=None,
            detail_flag=False,
            export_flag=True,
            last_done_at=None,
        )
        try:
            await self.repo.create(task)
            await self.session.commit()
        except SQLAlchemyError as exc:
            await self.session.rollback()
            raise TransactionError("タスク作成をロールバックしました") from exc
        return self._task_out(task)

    async def get_by_id(self, task_id: UUID, include_content: bool = False) -> TaskWithChildrenOut:
        task = await self.repo.get(task_id)
        if task is None:
            raise NotFoundError("タスクが見つかりません", {"id": str(task_id)})
        children = sorted(task.children, key=lambda child: (child.sort_order, child.created_at))
        return TaskWithChildrenOut(
            **self._task_out(task).model_dump(),
            children=[self._task_out(child) for child in children],
            task_contents=TaskContentOut.model_validate(task.content)
            if include_content and task.content is not None
            else None,
        )

    async def get_tree(self) -> list[TaskTreeOut]:
        tasks = await self.repo.list_all()
        return self._build_tree(tasks)

    async def update(self, task_id: UUID, input: UpdateTaskInput) -> UpdateResult:
        task = await self.repo.get_for_update(task_id)
        if task is None:
            raise NotFoundError("タスクが見つかりません", {"id": str(task_id)})

        fields = input.model_fields_set
        self._validate_tz_offset_if_needed(input, fields)

        new_parent_id = input.parent_id if "parent_id" in fields else task.parent_id
        new_event_at = input.event_at if "event_at" in fields else task.event_at
        if new_parent_id is None and new_event_at is None:
            raise RootEventAtRequiredError()
        if "parent_id" in fields and input.parent_id is not None:
            if input.parent_id == task.id:
                raise ValidationAppError("自身を親タスクにはできません", {"field": "parent_id"})
            parent = await self.repo.get(input.parent_id)
            if parent is None:
                raise NotFoundError("親タスクが見つかりません", {"id": str(input.parent_id)})
            descendants = await self.repo.get_descendants(task.id)
            if input.parent_id in {descendant.id for descendant in descendants}:
                raise ValidationAppError("子孫タスクを親タスクにはできません", {"field": "parent_id"})
            await self._ensure_depth_allowed(input.parent_id)

        status_before = task.status
        progress_before = task.progress
        wants_complete = input.status == TaskStatus.complete if "status" in fields else False
        progress_completes = input.progress == 100 if "progress" in fields else False

        if (
            "status" in fields
            and status_before == TaskStatus.complete
            and input.status == TaskStatus.incomplete
            and ("progress" not in fields or input.progress is None or input.progress >= 100)
        ):
            raise StatusConflictError("ステータスを未完了に戻す場合はprogress<100を同時指定してください")

        completion_trigger = (
            (wants_complete and status_before != TaskStatus.complete)
            or progress_completes
            or (progress_completes and progress_before != 100)
        )
        if completion_trigger:
            return await self.complete(task_id, confirmed=False, tz_offset=input.tz_offset)

        self._apply_update(task, input, fields)
        if "progress" in fields and input.progress == 100:
            task.status = TaskStatus.complete

        if self._should_update_last_done(input, fields):
            task.last_done_at = self._logical_today(input.tz_offset)

        try:
            await self.session.commit()
            await self.session.refresh(task)
            await self.session.refresh(task, attribute_names=["children", "content"])
        except SQLAlchemyError as exc:
            await self.session.rollback()
            raise TransactionError("タスク更新をロールバックしました") from exc
        return UpdateResult(type="updated", task=self._tree_out(task, []))

    async def delete(self, task_id: UUID) -> None:
        task = await self.repo.get(task_id)
        if task is None:
            raise NotFoundError("タスクが見つかりません", {"id": str(task_id)})
        descendants = await self.repo.get_descendants(task_id)
        task_ids = [task.id, *[descendant.id for descendant in descendants]]
        try:
            await self.repo.delete_tasks(task_ids)
            await self.session.commit()
        except SQLAlchemyError as exc:
            await self.session.rollback()
            raise TransactionError("カスケード削除をロールバックしました") from exc

    async def complete(self, task_id: UUID, confirmed: bool, tz_offset: int | None) -> CompleteResult:
        self._validate_tz_offset(tz_offset)
        task = await self.repo.get_for_update(task_id)
        if task is None:
            raise NotFoundError("タスクが見つかりません", {"id": str(task_id)})
        pending = await self.repo.get_unfinished_descendants(task_id)
        if pending and not confirmed:
            return CompleteResult(
                type="confirmation_required",
                pending_children=[
                    PendingChild(id=child.id, task_name=child.task_name, status=child.status)
                    for child in pending
                ],
            )

        logical_today = self._logical_today(tz_offset)
        descendants = await self.repo.get_descendants(task_id)
        try:
            for target in [*descendants, task]:
                target.status = TaskStatus.complete
                target.progress = 100
                target.last_done_at = logical_today
            await self.session.commit()
            await self.session.refresh(task)
            await self.session.refresh(task, attribute_names=["children", "content"])
            for descendant in descendants:
                await self.session.refresh(descendant)
        except SQLAlchemyError as exc:
            await self.session.rollback()
            raise TransactionError("一括完了をロールバックしました") from exc
        return CompleteResult(type="completed", task=self._tree_out(task, descendants))

    async def upsert_content(
        self, task_id: UUID, input: UpsertTaskContentInput
    ) -> TaskWithChildrenOut:
        task = await self.repo.get_for_update(task_id)
        if task is None:
            raise NotFoundError("タスクが見つかりません", {"id": str(task_id)})
        content = await self.repo.upsert_content(
            task, input.pre_info, input.notes, input.reflection
        )
        task.preview = self._derive_preview(input.notes)
        task.detail_flag = self._derive_detail_flag(input.pre_info, input.notes, input.reflection)
        try:
            await self.session.commit()
            await self.session.refresh(task)
            await self.session.refresh(task, attribute_names=["children", "content"])
        except SQLAlchemyError as exc:
            await self.session.rollback()
            raise TransactionError("Task_Content更新をロールバックしました") from exc
        return TaskWithChildrenOut(
            **self._task_out(task).model_dump(),
            children=[self._task_out(child) for child in task.children],
            task_contents=TaskContentOut.model_validate(content),
        )

    async def delete_content(self, task_id: UUID) -> TaskWithChildrenOut:
        task = await self.repo.get_for_update(task_id)
        if task is None:
            raise NotFoundError("タスクが見つかりません", {"id": str(task_id)})
        try:
            await self.repo.delete_content(task_id)
            task.preview = ""
            task.detail_flag = False
            await self.session.commit()
            await self.session.refresh(task)
            await self.session.refresh(task, attribute_names=["children", "content"])
        except SQLAlchemyError as exc:
            await self.session.rollback()
            raise TransactionError("Task_Content削除をロールバックしました") from exc
        return TaskWithChildrenOut(
            **self._task_out(task).model_dump(),
            children=[self._task_out(child) for child in task.children],
            task_contents=None,
        )

    async def _ensure_depth_allowed(self, parent_id: UUID) -> None:
        chain = await self.repo.get_parent_chain(parent_id)
        if len(chain) + 1 > MAX_DEPTH:
            raise HierarchyLimitError(
                "階層は最大10レベルまでです",
                {"current_depth": len(chain), "requested_depth": len(chain) + 1},
            )

    def _validate_tz_offset_if_needed(self, input: UpdateTaskInput, fields: set[str]) -> None:
        completion = ("progress" in fields and input.progress == 100) or (
            "status" in fields and input.status == TaskStatus.complete
        )
        if completion or self._should_update_last_done(input, fields):
            self._validate_tz_offset(input.tz_offset)

    def _validate_tz_offset(self, tz_offset: int | None) -> None:
        if tz_offset is None or tz_offset < -720 or tz_offset > 840:
            raise InvalidTimezoneOffsetError()

    def _logical_today(self, tz_offset: int | None) -> date:
        self._validate_tz_offset(tz_offset)
        # JS getTimezoneOffset は UTC - local の分数なので、符号を反転してローカル時刻へ寄せる。
        local_now = datetime.now(timezone.utc) - timedelta(minutes=tz_offset)
        if local_now.hour < DAY_BOUNDARY_HOUR:
            local_now -= timedelta(days=1)
        return local_now.date()

    def _should_update_last_done(self, input: UpdateTaskInput, fields: set[str]) -> bool:
        return input.update_last_done and bool({"progress", "actual_time"} & fields)

    def _apply_update(self, task: Task, input: UpdateTaskInput, fields: set[str]) -> None:
        for field in (
            "task_name",
            "progress",
            "status",
            "priority",
            "event_at",
            "parent_id",
            "estimated_time",
            "actual_time",
            "sort_order",
            "task_type",
            "export_flag",
        ):
            if field in fields:
                setattr(task, field, getattr(input, field))

    def _derive_preview(self, notes: str | None) -> str:
        if notes is None or notes.strip() == "":
            return ""
        first_line = notes.splitlines()[0] if "\n" in notes else notes
        return first_line[:100]

    def _derive_detail_flag(
        self, pre_info: str | None, notes: str | None, reflection: str | None
    ) -> bool:
        return any(value is not None and value.strip() != "" for value in (pre_info, notes, reflection))

    def _task_out(self, task: Task) -> TaskOut:
        return TaskOut.model_validate(task)

    def _tree_out(self, task: Task, descendants: list[Task]) -> TaskTreeOut:
        return self._build_tree([task, *descendants], root_id=task.id)[0]

    def _build_tree(self, tasks: list[Task], root_id: UUID | None = None) -> list[TaskTreeOut]:
        children_by_parent: dict[UUID | None, list[Task]] = {}
        for task in tasks:
            children_by_parent.setdefault(task.parent_id, []).append(task)
        for children in children_by_parent.values():
            children.sort(key=lambda child: (child.sort_order, child.created_at))

        def build(task: Task) -> TaskTreeOut:
            return TaskTreeOut(
                **self._task_out(task).model_dump(),
                children=[build(child) for child in children_by_parent.get(task.id, [])],
            )

        roots = children_by_parent.get(None, []) if root_id is None else [
            task for task in tasks if task.id == root_id
        ]
        return [build(root) for root in roots]
