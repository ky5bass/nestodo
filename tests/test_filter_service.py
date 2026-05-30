from __future__ import annotations

from datetime import date, datetime, timezone

from app.api import get_task_tree
from app.errors import InvalidTimezoneOffsetError
from app.schemas import CreateTaskInput
from app.services import FilterService, TaskService


async def test_day_boundary_uses_5am_local_time(session):
    service = FilterService(session)

    before_start, before_end = service.get_day_boundary(
        datetime(2026, 5, 31, 19, 59, tzinfo=timezone.utc), -540
    )
    after_start, after_end = service.get_day_boundary(
        datetime(2026, 5, 31, 20, 0, tzinfo=timezone.utc), -540
    )

    assert before_start.date() == date(2026, 5, 31)
    assert before_end.date() == date(2026, 6, 1)
    assert after_start.date() == date(2026, 6, 1)
    assert after_end.date() == date(2026, 6, 2)


async def test_effective_at_inherits_nearest_ancestor_without_mutating(session):
    task_service = TaskService(session)
    root = await task_service.create(
        CreateTaskInput(
            task_name="root",
            task_type="TODO",
            sort_order=1,
            event_at=datetime(2026, 8, 1, 9, 0),
        )
    )
    parent = await task_service.create(
        CreateTaskInput(
            task_name="parent",
            task_type="TODO",
            sort_order=1,
            parent_id=root.id,
            event_at=datetime(2026, 6, 10, 9, 0),
        )
    )
    child = await task_service.create(
        CreateTaskInput(task_name="child", task_type="TODO", sort_order=1, parent_id=parent.id)
    )
    tasks = await FilterService(session).repo.list_all()
    by_id = {task.id: task for task in tasks}

    effective_at = FilterService(session).compute_effective_at(
        by_id[child.id], [by_id[root.id], by_id[parent.id]]
    )

    assert effective_at == datetime(2026, 6, 10, 9, 0)
    assert by_id[child.id].event_at is None


async def test_filtered_tree_includes_ancestors_and_sorts_siblings(session):
    task_service = TaskService(session)
    root = await task_service.create(
        CreateTaskInput(
            task_name="root",
            task_type="TODO",
            sort_order=1,
            event_at=datetime(2026, 8, 1, 9, 0),
        )
    )
    later = await task_service.create(
        CreateTaskInput(
            task_name="later",
            task_type="TODO",
            sort_order=2,
            parent_id=root.id,
            event_at=datetime(2026, 6, 15, 9, 0),
        )
    )
    earlier = await task_service.create(
        CreateTaskInput(
            task_name="earlier",
            task_type="TODO",
            sort_order=1,
            parent_id=root.id,
            event_at=datetime(2026, 6, 10, 9, 0),
        )
    )
    await task_service.create(
        CreateTaskInput(
            task_name="far",
            task_type="TODO",
            sort_order=3,
            parent_id=root.id,
            event_at=datetime(2026, 7, 2, 9, 0),
        )
    )

    tree = await FilterService(session).get_filtered_task_tree(
        datetime(2026, 5, 31, 20, 0, tzinfo=timezone.utc), -540
    )

    assert [node.id for node in tree] == [root.id]
    assert [node.id for node in tree[0].children] == [earlier.id, later.id]


async def test_filtered_api_returns_tree_and_validates_tz_offset(session):
    task_service = TaskService(session)
    root = await task_service.create(
        CreateTaskInput(
            task_name="root",
            task_type="TODO",
            sort_order=1,
            event_at=datetime(2000, 1, 1, 9, 0),
        )
    )
    filter_service = FilterService(session)

    response = await get_task_tree(
        filtered=True,
        tz_offset=-540,
        service=task_service,
        filter_service=filter_service,
    )

    assert response[0].id == root.id
    try:
        await get_task_tree(
            filtered=True,
            tz_offset=900,
            service=task_service,
            filter_service=filter_service,
        )
    except InvalidTimezoneOffsetError as exc:
        assert exc.code == "invalid_tz_offset"
    else:
        raise AssertionError("invalid_tz_offset must be raised")
