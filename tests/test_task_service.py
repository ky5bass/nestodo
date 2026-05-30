from __future__ import annotations

from datetime import datetime

import pytest

from app.errors import (
    HierarchyLimitError,
    InvalidTimezoneOffsetError,
    NotFoundError,
    RootEventAtRequiredError,
    StatusConflictError,
)
from app.models import TaskStatus
from app.repositories import TaskRepository
from app.schemas import CreateTaskInput, UpdateTaskInput, UpsertTaskContentInput
from app.services import TaskService


ROOT_EVENT_AT = datetime(2026, 5, 31, 9, 0, 0)


async def create_root(service: TaskService, name: str = "root"):
    return await service.create(
        CreateTaskInput(
            task_name=name,
            task_type="TODO",
            sort_order=1.0,
            event_at=ROOT_EVENT_AT,
        )
    )


async def test_create_root_requires_event_at(session):
    service = TaskService(session)
    with pytest.raises(RootEventAtRequiredError):
        await service.create(CreateTaskInput(task_name="root", task_type="TODO", sort_order=1.0))


async def test_create_sets_defaults_and_get_tree(session):
    service = TaskService(session)
    root = await create_root(service)
    child = await service.create(
        CreateTaskInput(
            task_name="child",
            task_type="TODO",
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


async def test_create_fails_for_unknown_parent(session):
    service = TaskService(session)
    root = await create_root(service)
    await service.delete(root.id)

    with pytest.raises(NotFoundError):
        await service.create(
            CreateTaskInput(
                task_name="orphan",
                task_type="TODO",
                sort_order=1.0,
                parent_id=root.id,
            )
        )


async def test_hierarchy_limit(session):
    service = TaskService(session)
    current = await create_root(service)
    for index in range(9):
        current = await service.create(
            CreateTaskInput(
                task_name=f"level-{index}",
                task_type="TODO",
                sort_order=float(index),
                parent_id=current.id,
            )
        )

    with pytest.raises(HierarchyLimitError):
        await service.create(
            CreateTaskInput(
                task_name="too-deep",
                task_type="TODO",
                sort_order=11.0,
                parent_id=current.id,
            )
        )


async def test_partial_update_preserves_unspecified_fields_and_last_done(session):
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


async def test_root_event_at_invariant_on_update(session):
    service = TaskService(session)
    root = await create_root(service)

    with pytest.raises(RootEventAtRequiredError):
        await service.update(root.id, UpdateTaskInput(event_at=None))


async def test_status_back_requires_progress_under_100(session):
    service = TaskService(session)
    root = await create_root(service)
    await service.complete(root.id, confirmed=False, tz_offset=-540)

    with pytest.raises(StatusConflictError):
        await service.update(root.id, UpdateTaskInput(status="incomplete"))

    result = await service.update(
        root.id, UpdateTaskInput(status="incomplete", progress=10, tz_offset=-540)
    )
    assert result.type == "updated"
    updated = await service.get_by_id(root.id)
    assert updated.status == TaskStatus.incomplete
    assert updated.progress == 10


async def test_completion_requires_confirmation_for_unfinished_descendants(session):
    service = TaskService(session)
    root = await create_root(service)
    child = await service.create(
        CreateTaskInput(task_name="child", task_type="TODO", sort_order=1.0, parent_id=root.id)
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


async def test_completion_requires_valid_tz_offset(session):
    service = TaskService(session)
    root = await create_root(service)

    with pytest.raises(InvalidTimezoneOffsetError):
        await service.update(root.id, UpdateTaskInput(progress=100))


async def test_delete_cascades_contents(session):
    service = TaskService(session)
    root = await create_root(service)
    child = await service.create(
        CreateTaskInput(task_name="child", task_type="TODO", sort_order=1.0, parent_id=root.id)
    )
    await service.upsert_content(child.id, UpsertTaskContentInput(notes="note"))

    await service.delete(root.id)

    repo = TaskRepository(session)
    assert await repo.get(root.id) is None
    assert await repo.get(child.id) is None
    assert await repo.get_content(child.id) is None


async def test_content_preview_and_detail_flag(session):
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


async def test_delete_content_clears_summary_fields(session):
    service = TaskService(session)
    root = await create_root(service)
    await service.upsert_content(root.id, UpsertTaskContentInput(notes="note"))

    result = await service.delete_content(root.id)

    assert result.task_contents is None
    assert result.preview == ""
    assert result.detail_flag is False
