from __future__ import annotations

from uuid import UUID

from sqlalchemy import Select, delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import Task, TaskContent, TaskStatus


class TaskRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    def _with_relations(self, statement: Select[tuple[Task]]) -> Select[tuple[Task]]:
        return statement.options(selectinload(Task.children), selectinload(Task.content))

    async def get(self, task_id: UUID) -> Task | None:
        result = await self.session.execute(
            self._with_relations(select(Task).where(Task.id == task_id))
        )
        return result.scalar_one_or_none()

    async def get_for_update(self, task_id: UUID) -> Task | None:
        result = await self.session.execute(
            self._with_relations(select(Task).where(Task.id == task_id).with_for_update())
        )
        return result.scalar_one_or_none()

    async def get_parent_chain(self, parent_id: UUID | None) -> list[Task]:
        chain: list[Task] = []
        current_id = parent_id
        while current_id is not None:
            parent = await self.get(current_id)
            if parent is None:
                break
            chain.append(parent)
            current_id = parent.parent_id
        return chain

    async def list_all(self) -> list[Task]:
        result = await self.session.execute(
            self._with_relations(select(Task).order_by(Task.sort_order, Task.created_at))
        )
        return list(result.scalars().unique().all())

    async def list_roots(self) -> list[Task]:
        result = await self.session.execute(
            self._with_relations(
                select(Task).where(Task.parent_id.is_(None)).order_by(Task.sort_order, Task.created_at)
            )
        )
        return list(result.scalars().unique().all())

    async def get_descendants(self, task_id: UUID) -> list[Task]:
        all_tasks = await self.list_all()
        by_parent: dict[UUID | None, list[Task]] = {}
        for task in all_tasks:
            by_parent.setdefault(task.parent_id, []).append(task)

        descendants: list[Task] = []

        def walk(parent_id: UUID) -> None:
            for child in by_parent.get(parent_id, []):
                descendants.append(child)
                walk(child.id)

        walk(task_id)
        return descendants

    async def get_unfinished_descendants(self, task_id: UUID) -> list[Task]:
        return [
            task
            for task in await self.get_descendants(task_id)
            if task.status != TaskStatus.complete or task.progress != 100
        ]

    async def create(self, task: Task) -> Task:
        self.session.add(task)
        await self.session.flush()
        await self.session.refresh(task, attribute_names=["children", "content"])
        return task

    async def delete_tasks(self, task_ids: list[UUID]) -> None:
        await self.session.execute(delete(TaskContent).where(TaskContent.task_id.in_(task_ids)))
        await self.session.execute(delete(Task).where(Task.id.in_(task_ids)))
        await self.session.flush()

    async def get_content(self, task_id: UUID) -> TaskContent | None:
        return await self.session.get(TaskContent, task_id)

    async def upsert_content(
        self, task: Task, pre_info: str | None, notes: str | None, reflection: str | None
    ) -> TaskContent:
        content = await self.get_content(task.id)
        if content is None:
            content = TaskContent(task_id=task.id)
            self.session.add(content)
        content.pre_info = pre_info
        content.notes = notes
        content.reflection = reflection
        await self.session.flush()
        return content

    async def delete_content(self, task_id: UUID) -> None:
        await self.session.execute(delete(TaskContent).where(TaskContent.task_id == task_id))
        await self.session.flush()
