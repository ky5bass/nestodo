from __future__ import annotations

from collections.abc import AsyncGenerator
from datetime import date, datetime, timezone

from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.main import app
from app.models import TaskType
from app.schemas import CreateTaskInput
from app.services import FilterService, TaskService


async def test_day_boundary_uses_5am_local_time(session: AsyncSession) -> None:
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


async def test_effective_at_inherits_nearest_ancestor_without_mutating(
    session: AsyncSession,
) -> None:
    task_service = TaskService(session)
    root = await task_service.create(
        CreateTaskInput(
            task_name="root",
            task_type=TaskType.TODO,
            sort_order=1,
            event_at=datetime(2026, 8, 1, 9, 0),
        )
    )
    parent = await task_service.create(
        CreateTaskInput(
            task_name="parent",
            task_type=TaskType.TODO,
            sort_order=1,
            parent_id=root.id,
            event_at=datetime(2026, 6, 10, 9, 0),
        )
    )
    child = await task_service.create(
        CreateTaskInput(
            task_name="child", task_type=TaskType.TODO, sort_order=1, parent_id=parent.id
        )
    )
    tasks = await FilterService(session).repo.list_all()
    by_id = {task.id: task for task in tasks}

    effective_at = FilterService(session).compute_effective_at(
        by_id[child.id], [by_id[root.id], by_id[parent.id]]
    )

    assert effective_at == datetime(2026, 6, 10, 9, 0)
    assert by_id[child.id].event_at is None


async def test_filtered_tree_includes_ancestors_and_sorts_siblings(
    session: AsyncSession,
) -> None:
    task_service = TaskService(session)
    root = await task_service.create(
        CreateTaskInput(
            task_name="root",
            task_type=TaskType.TODO,
            sort_order=1,
            event_at=datetime(2026, 8, 1, 9, 0),
        )
    )
    later = await task_service.create(
        CreateTaskInput(
            task_name="later",
            task_type=TaskType.TODO,
            sort_order=2,
            parent_id=root.id,
            event_at=datetime(2026, 6, 15, 9, 0),
        )
    )
    earlier = await task_service.create(
        CreateTaskInput(
            task_name="earlier",
            task_type=TaskType.TODO,
            sort_order=1,
            parent_id=root.id,
            event_at=datetime(2026, 6, 10, 9, 0),
        )
    )
    await task_service.create(
        CreateTaskInput(
            task_name="far",
            task_type=TaskType.TODO,
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


async def test_filtered_api_returns_tree_and_validates_tz_offset(
    session: AsyncSession,
) -> None:
    task_service = TaskService(session)
    root = await task_service.create(
        CreateTaskInput(
            task_name="root",
            task_type=TaskType.TODO,
            sort_order=1,
            event_at=datetime(2000, 1, 1, 9, 0),
        )
    )

    async def override_session() -> AsyncGenerator[AsyncSession]:
        yield session

    app.dependency_overrides[get_session] = override_session
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/tasks?filtered=true&tz_offset=-540")
            invalid = await client.get("/api/tasks?filtered=true&tz_offset=900")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json()[0]["id"] == str(root.id)
    assert invalid.status_code == 400
    assert invalid.json()["error"]["code"] == "invalid_tz_offset"
