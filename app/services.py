from __future__ import annotations

import calendar
from datetime import date, datetime, time, timedelta, timezone
from uuid import UUID

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.errors import (
    AppError,
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
    BatchOperation,
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

    async def update(self, task_id: UUID, input: UpdateTaskInput) -> UpdateResult | CompleteResult:
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
        )
        if completion_trigger:
            return await self.complete(task_id, confirmed=False, tz_offset=input.tz_offset)

        self._apply_update(task, input, fields)

        if self._should_update_last_done(input, fields):
            task.last_done_at = self._logical_today(input.tz_offset)

        try:
            await self.session.commit()
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

    async def batch_update(self, operations: list[BatchOperation]) -> None:
        client_tasks: dict[str, Task] = {}
        try:
            for operation in operations:
                await self._apply_batch_operation(operation, client_tasks)
            await self.session.flush()
            await self._validate_batch_final_state()
            await self.session.commit()
        except AppError:
            await self.session.rollback()
            raise
        except SQLAlchemyError as exc:
            await self.session.rollback()
            raise TransactionError("一括更新をロールバックしました") from exc

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
            await self.session.refresh(task, attribute_names=["children", "content"])
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
        assert tz_offset is not None
        # JS getTimezoneOffset は UTC - local の分数なので、符号を反転してローカル時刻へ寄せる。
        local_now = datetime.now(timezone.utc) - timedelta(minutes=tz_offset)
        if local_now.hour < DAY_BOUNDARY_HOUR:
            local_now -= timedelta(days=1)
        logical_date: date = local_now.date()
        return logical_date

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

    async def _resolve_batch_task(
        self, operation: BatchOperation, client_tasks: dict[str, Task]
    ) -> Task:
        if operation.client_id is not None:
            task = client_tasks.get(operation.client_id)
            if task is None:
                raise NotFoundError("タスクが見つかりません", {"client_id": operation.client_id})
            return task
        assert operation.task_id is not None
        task = await self.repo.get_for_update(operation.task_id)
        if task is None:
            raise NotFoundError("タスクが見つかりません", {"id": str(operation.task_id)})
        return task

    async def _resolve_batch_parent(
        self, operation: BatchOperation, client_tasks: dict[str, Task]
    ) -> Task | None:
        if operation.new_parent_client_id is not None:
            parent = client_tasks.get(operation.new_parent_client_id)
            if parent is None:
                raise NotFoundError(
                    "親タスクが見つかりません",
                    {"client_id": operation.new_parent_client_id},
                )
            return parent
        if operation.new_parent_id is None:
            return None
        parent = await self.repo.get(operation.new_parent_id)
        if parent is None:
            raise NotFoundError("親タスクが見つかりません", {"id": str(operation.new_parent_id)})
        return parent

    async def _apply_batch_operation(
        self, operation: BatchOperation, client_tasks: dict[str, Task]
    ) -> None:
        if operation.type == "rename":
            task = await self._resolve_batch_task(operation, client_tasks)
            assert operation.name is not None
            task.task_name = operation.name
            return

        if operation.type == "create":
            assert operation.name is not None
            assert operation.task_type is not None
            assert operation.sort_order is not None
            parent = await self._resolve_batch_parent(operation, client_tasks)
            task = Task(
                parent_id=parent.id if parent is not None else None,
                task_name=operation.name,
                task_type=operation.task_type,
                sort_order=operation.sort_order,
                event_at=operation.event_at,
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
            await self.repo.create(task)
            await self.session.flush()
            if operation.client_id is not None:
                client_tasks[operation.client_id] = task
            return

        if operation.type == "delete":
            task = await self._resolve_batch_task(operation, client_tasks)
            descendants = await self.repo.get_descendants(task.id)
            task_ids = [task.id, *[descendant.id for descendant in descendants]]
            await self.repo.delete_tasks(task_ids)
            return

        task = await self._resolve_batch_task(operation, client_tasks)
        parent = await self._resolve_batch_parent(operation, client_tasks)
        if parent is not None:
            if parent.id == task.id:
                raise ValidationAppError("自身を親タスクにはできません", {"field": "new_parent_id"})
            descendants = await self.repo.get_descendants(task.id)
            if parent.id in {descendant.id for descendant in descendants}:
                raise ValidationAppError("子孫タスクを親タスクにはできません", {"field": "new_parent_id"})
        task.parent_id = parent.id if parent is not None else None
        assert operation.sort_order is not None
        task.sort_order = operation.sort_order
        if operation.event_at is not None:
            task.event_at = operation.event_at

    async def _validate_batch_final_state(self) -> None:
        tasks = await self.repo.list_all()
        task_by_id = {task.id: task for task in tasks}
        children_by_parent: dict[UUID | None, list[Task]] = {}
        for task in tasks:
            children_by_parent.setdefault(task.parent_id, []).append(task)
            if task.parent_id is None and task.event_at is None:
                raise RootEventAtRequiredError()
            if task.parent_id is not None and task.parent_id not in task_by_id:
                raise NotFoundError("親タスクが見つかりません", {"id": str(task.parent_id)})

        def walk(task: Task, depth: int, path: set[UUID]) -> None:
            if task.id in path:
                raise ValidationAppError("タスク階層に循環があります", {"id": str(task.id)})
            if depth > MAX_DEPTH:
                raise HierarchyLimitError(
                    "階層は最大10レベルまでです",
                    {"task_id": str(task.id), "requested_depth": depth},
                )
            for child in children_by_parent.get(task.id, []):
                walk(child, depth + 1, {*path, task.id})

        for root in children_by_parent.get(None, []):
            walk(root, 1, set())

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


class FilterService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repo = TaskRepository(session)

    async def get_filtered_task_tree(
        self, now: datetime, timezone_offset: int | None
    ) -> list[TaskTreeOut]:
        self._validate_tz_offset(timezone_offset)
        assert timezone_offset is not None
        tasks = await self.repo.list_all()
        return self.get_filtered_tree(tasks, now, timezone_offset)

    def get_day_boundary(
        self, now: datetime, timezone_offset: int
    ) -> tuple[datetime, datetime]:
        self._validate_tz_offset(timezone_offset)
        local_now = self._to_local_datetime(now, timezone_offset)
        logical_date = local_now.date()
        if local_now.hour < DAY_BOUNDARY_HOUR:
            logical_date -= timedelta(days=1)
        start = datetime.combine(logical_date, time(hour=DAY_BOUNDARY_HOUR))
        return start, start + timedelta(days=1)

    def compute_effective_at(self, task: Task, ancestors: list[Task]) -> datetime | None:
        if task.event_at is not None:
            return task.event_at
        for ancestor in reversed(ancestors):
            if ancestor.event_at is not None:
                return ancestor.event_at
        return None

    def evaluate_visibility(
        self, task: Task, effective_at: datetime | None, today: date
    ) -> bool:
        if task.status == TaskStatus.complete:
            return task.last_done_at == today
        if effective_at is None:
            return False
        return effective_at.date() <= self._add_month(today, 1)

    def get_filtered_tree(
        self, all_tasks: list[Task], now: datetime, timezone_offset: int
    ) -> list[TaskTreeOut]:
        self._validate_tz_offset(timezone_offset)
        day_start, _ = self.get_day_boundary(now, timezone_offset)
        today = day_start.date()
        children_by_parent: dict[UUID | None, list[Task]] = {}
        for task in all_tasks:
            children_by_parent.setdefault(task.parent_id, []).append(task)
        for children in children_by_parent.values():
            children.sort(key=lambda child: (child.sort_order, child.created_at))

        def build(task: Task, ancestors: list[Task]) -> TaskTreeOut | None:
            effective_at = self.compute_effective_at(task, ancestors)
            children = [
                node
                for child in children_by_parent.get(task.id, [])
                if (node := build(child, [*ancestors, task])) is not None
            ]
            if not children and not self.evaluate_visibility(task, effective_at, today):
                return None
            return TaskTreeOut(**TaskOut.model_validate(task).model_dump(), children=children)

        return [
            node
            for root in children_by_parent.get(None, [])
            if (node := build(root, [])) is not None
        ]

    def _validate_tz_offset(self, timezone_offset: int | None) -> None:
        if timezone_offset is None or timezone_offset < -720 or timezone_offset > 840:
            raise InvalidTimezoneOffsetError()

    def _to_local_datetime(self, now: datetime, timezone_offset: int) -> datetime:
        now_utc = now
        if now_utc.tzinfo is None:
            now_utc = now_utc.replace(tzinfo=timezone.utc)
        else:
            now_utc = now_utc.astimezone(timezone.utc)
        return (now_utc - timedelta(minutes=timezone_offset)).replace(tzinfo=None)

    def _add_month(self, value: date, months: int) -> date:
        month_index = value.month - 1 + months
        year = value.year + month_index // 12
        month = month_index % 12 + 1
        day = min(value.day, calendar.monthrange(year, month)[1])
        return date(year, month, day)
