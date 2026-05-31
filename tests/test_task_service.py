from __future__ import annotations

from datetime import UTC, date, datetime
from typing import ClassVar, Self, cast

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

import app.services as services_module
from app.errors import (
    HierarchyLimitError,
    InvalidTimezoneOffsetError,
    NotFoundError,
    RootEventAtRequiredError,
    StatusConflictError,
)
from app.models import TaskStatus, TaskType
from app.repositories import TaskRepository
from app.schemas import (
    BatchOperation,
    CreateTaskInput,
    TaskOut,
    UpdateTaskInput,
    UpsertTaskContentInput,
)
from app.services import TaskService


ROOT_EVENT_AT = datetime(2026, 5, 31, 9, 0, 0)


async def create_root(service: TaskService, name: str = "root") -> TaskOut:
    return await service.create(
        CreateTaskInput(
            task_name=name,
            task_type=TaskType.TODO,
            sort_order=1.0,
            event_at=ROOT_EVENT_AT,
        )
    )


async def test_create_root_requires_event_at(session: AsyncSession) -> None:
    service = TaskService(session)
    with pytest.raises(RootEventAtRequiredError):
        await service.create(
            CreateTaskInput(task_name="root", task_type=TaskType.TODO, sort_order=1.0)
        )


async def test_create_sets_defaults_and_get_tree(session: AsyncSession) -> None:
    service = TaskService(session)
    root = await create_root(service)
    child = await service.create(
        CreateTaskInput(
            task_name="child",
            task_type=TaskType.TODO,
            sort_order=2.0,
            parent_id=root.id,
        )
    )

    tree = await service.get_tree()

    assert root.status == TaskStatus.incomplete
    assert root.progress is None
    assert root.export_flag is True
    assert tree[0].id == root.id
    assert tree[0].children[0].id == child.id


async def test_create_fails_for_unknown_parent(session: AsyncSession) -> None:
    service = TaskService(session)
    root = await create_root(service)
    await service.delete(root.id)

    with pytest.raises(NotFoundError):
        await service.create(
            CreateTaskInput(
                task_name="orphan",
                task_type=TaskType.TODO,
                sort_order=1.0,
                parent_id=root.id,
            )
        )


async def test_hierarchy_limit(session: AsyncSession) -> None:
    service = TaskService(session)
    current = await create_root(service)
    for index in range(9):
        current = await service.create(
            CreateTaskInput(
                task_name=f"level-{index}",
                task_type=TaskType.TODO,
                sort_order=float(index),
                parent_id=current.id,
            )
        )

    with pytest.raises(HierarchyLimitError):
        await service.create(
            CreateTaskInput(
                task_name="too-deep",
                task_type=TaskType.TODO,
                sort_order=11.0,
                parent_id=current.id,
            )
        )


async def test_partial_update_preserves_unspecified_fields_and_last_done(
    session: AsyncSession,
) -> None:
    service = TaskService(session)
    root = await create_root(service)

    result = await service.update(
        root.id, UpdateTaskInput(task_name="renamed", actual_time=15, tz_offset=-540)
    )

    assert result.type == "updated"
    updated = await service.get_by_id(root.id)
    assert updated.task_name == "renamed"
    assert updated.event_at == ROOT_EVENT_AT
    assert updated.last_done_at is not None


async def test_root_event_at_invariant_on_update(session: AsyncSession) -> None:
    service = TaskService(session)
    root = await create_root(service)

    with pytest.raises(RootEventAtRequiredError):
        await service.update(root.id, UpdateTaskInput(event_at=None))


async def test_promoting_child_to_root_requires_event_at_in_same_request(
    session: AsyncSession,
) -> None:
    service = TaskService(session)
    root = await create_root(service)
    child = await service.create(
        CreateTaskInput(
            task_name="child",
            task_type=TaskType.TODO,
            sort_order=1.0,
            parent_id=root.id,
        )
    )

    with pytest.raises(RootEventAtRequiredError):
        await service.update(child.id, UpdateTaskInput(parent_id=None))

    unchanged = await service.get_by_id(child.id)
    assert unchanged.parent_id == root.id
    assert unchanged.event_at is None


async def test_promoting_child_to_root_accepts_event_at_in_same_request(
    session: AsyncSession,
) -> None:
    service = TaskService(session)
    root = await create_root(service)
    child = await service.create(
        CreateTaskInput(
            task_name="child",
            task_type=TaskType.TODO,
            sort_order=1.0,
            parent_id=root.id,
        )
    )

    result = await service.update(
        child.id,
        UpdateTaskInput(parent_id=None, event_at=datetime(2026, 6, 1, 9, 0, 0)),
    )

    assert result.type == "updated"
    updated = await service.get_by_id(child.id)
    assert updated.parent_id is None
    assert updated.event_at == datetime(2026, 6, 1, 9, 0, 0)


async def test_status_back_requires_progress_under_100(session: AsyncSession) -> None:
    service = TaskService(session)
    root = await create_root(service)
    await service.complete(root.id, confirmed=False, tz_offset=-540)

    with pytest.raises(StatusConflictError):
        await service.update(root.id, UpdateTaskInput(status=TaskStatus.incomplete))

    result = await service.update(
        root.id, UpdateTaskInput(status=TaskStatus.incomplete, progress=10, tz_offset=-540)
    )
    assert result.type == "updated"
    updated = await service.get_by_id(root.id)
    assert updated.status == TaskStatus.incomplete
    assert updated.progress == 10


async def test_completion_requires_confirmation_for_unfinished_descendants(
    session: AsyncSession,
) -> None:
    service = TaskService(session)
    root = await create_root(service)
    child = await service.create(
        CreateTaskInput(
            task_name="child", task_type=TaskType.TODO, sort_order=1.0, parent_id=root.id
        )
    )

    result = await service.update(root.id, UpdateTaskInput(progress=100, tz_offset=-540))
    assert result.type == "confirmation_required"
    assert result.pending_children is not None
    assert result.pending_children[0].id == child.id

    completed = await service.complete(root.id, confirmed=True, tz_offset=-540)
    assert completed.type == "completed"
    root_after = await service.get_by_id(root.id)
    child_after = await service.get_by_id(child.id)
    assert root_after.status == TaskStatus.complete
    assert child_after.status == TaskStatus.complete
    assert root_after.progress == 100
    assert child_after.progress == 100
    assert root_after.last_done_at == child_after.last_done_at


async def test_completion_requires_valid_tz_offset(session: AsyncSession) -> None:
    service = TaskService(session)
    root = await create_root(service)

    with pytest.raises(InvalidTimezoneOffsetError):
        await service.update(root.id, UpdateTaskInput(progress=100))


async def test_logical_today_uses_5am_day_boundary(
    session: AsyncSession, monkeypatch: pytest.MonkeyPatch
) -> None:
    service = TaskService(session)

    class FrozenDatetime(datetime):
        current: ClassVar[datetime]

        @classmethod
        def now(cls, tz: object = None) -> Self:
            _ = tz
            return cast(Self, cls.current)

    monkeypatch.setattr(services_module, "datetime", FrozenDatetime)

    FrozenDatetime.current = datetime(2026, 5, 31, 19, 59, tzinfo=UTC)
    assert service._logical_today(-540) == date(2026, 5, 31)

    FrozenDatetime.current = datetime(2026, 5, 31, 20, 0, tzinfo=UTC)
    assert service._logical_today(-540) == date(2026, 6, 1)


async def test_delete_cascades_contents(session: AsyncSession) -> None:
    service = TaskService(session)
    root = await create_root(service)
    child = await service.create(
        CreateTaskInput(
            task_name="child", task_type=TaskType.TODO, sort_order=1.0, parent_id=root.id
        )
    )
    await service.upsert_content(child.id, UpsertTaskContentInput(notes="note"))

    await service.delete(root.id)

    repo = TaskRepository(session)
    assert await repo.get(root.id) is None
    assert await repo.get(child.id) is None
    assert await repo.get_content(child.id) is None


async def test_content_preview_and_detail_flag(session: AsyncSession) -> None:
    service = TaskService(session)
    root = await create_root(service)

    result = await service.upsert_content(
        root.id,
        UpsertTaskContentInput(
            pre_info=" ",
            notes="1234567890" * 11 + "\nsecond",
            reflection=None,
        ),
    )

    assert result.preview == "1234567890" * 10
    assert result.detail_flag is True

    empty = await service.upsert_content(
        root.id, UpsertTaskContentInput(pre_info=" ", notes=" ", reflection=None)
    )
    assert empty.preview == ""
    assert empty.detail_flag is False


async def test_delete_content_clears_summary_fields(session: AsyncSession) -> None:
    service = TaskService(session)
    root = await create_root(service)
    await service.upsert_content(root.id, UpsertTaskContentInput(notes="note"))

    result = await service.delete_content(root.id)

    assert result.task_contents is None
    assert result.preview == ""
    assert result.detail_flag is False


async def test_batch_update_applies_operations_atomically(session: AsyncSession) -> None:
    service = TaskService(session)
    root = await create_root(service)
    child = await service.create(
        CreateTaskInput(
            task_name="child",
            task_type=TaskType.TODO,
            sort_order=1.0,
            parent_id=root.id,
        )
    )

    await service.batch_update(
        [
            BatchOperation(type="rename", task_id=child.id, name="renamed child"),
            BatchOperation(
                type="move",
                task_id=child.id,
                new_parent_id=None,
                sort_order=2.0,
                event_at=ROOT_EVENT_AT,
            ),
        ]
    )

    updated = await service.get_by_id(child.id)
    assert updated.task_name == "renamed child"
    assert updated.parent_id is None
    assert updated.event_at == ROOT_EVENT_AT


async def test_batch_update_accepts_timezone_aware_event_at(
    session: AsyncSession,
) -> None:
    service = TaskService(session)
    aware_event_at = datetime(2027, 5, 31, 9, 0, 0, tzinfo=UTC)

    await service.batch_update(
        [
            BatchOperation(
                type="create",
                name="root from frontend",
                sort_order=1.0,
                task_type=TaskType.TODO,
                event_at=aware_event_at,
            ),
        ]
    )

    tree = await service.get_tree()
    assert tree[0].event_at == datetime(2027, 5, 31, 9, 0, 0)
    assert tree[0].event_at.tzinfo is None


async def test_batch_update_rolls_back_when_final_root_event_at_is_invalid(
    session: AsyncSession,
) -> None:
    service = TaskService(session)
    root = await create_root(service)
    child = await service.create(
        CreateTaskInput(
            task_name="child",
            task_type=TaskType.TODO,
            sort_order=1.0,
            parent_id=root.id,
        )
    )

    with pytest.raises(RootEventAtRequiredError):
        await service.batch_update(
            [
                BatchOperation(type="rename", task_id=child.id, name="should rollback"),
                BatchOperation(
                    type="move",
                    task_id=child.id,
                    new_parent_id=None,
                    sort_order=2.0,
                ),
            ]
        )

    updated = await service.get_by_id(child.id)
    assert updated.task_name == "child"
    assert updated.parent_id == root.id
