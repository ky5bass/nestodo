from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.schemas import (
    CompleteResult,
    CreateTaskInput,
    TaskOut,
    TaskTreeOut,
    TaskWithChildrenOut,
    UpdateResult,
    UpdateTaskInput,
    UpsertTaskContentInput,
)
from app.services import TaskService

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


def get_task_service(session: AsyncSession = Depends(get_session)) -> TaskService:
    return TaskService(session)


@router.post("", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
async def create_task(
    input: CreateTaskInput, service: TaskService = Depends(get_task_service)
) -> TaskOut:
    return await service.create(input)


@router.get("", response_model=list[TaskTreeOut])
async def get_task_tree(service: TaskService = Depends(get_task_service)) -> list[TaskTreeOut]:
    return await service.get_tree()


@router.get("/{task_id}", response_model=TaskWithChildrenOut)
async def get_task(
    task_id: UUID,
    include_content: bool = Query(default=False),
    service: TaskService = Depends(get_task_service),
) -> TaskWithChildrenOut:
    return await service.get_by_id(task_id, include_content=include_content)


@router.put("/{task_id}", response_model=UpdateResult)
async def update_task(
    task_id: UUID,
    input: UpdateTaskInput,
    service: TaskService = Depends(get_task_service),
) -> UpdateResult | CompleteResult:
    return await service.update(task_id, input)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: UUID, service: TaskService = Depends(get_task_service)
) -> Response:
    await service.delete(task_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{task_id}/complete", response_model=CompleteResult)
async def complete_task(
    task_id: UUID,
    confirmed: bool = False,
    tz_offset: int | None = None,
    service: TaskService = Depends(get_task_service),
) -> CompleteResult:
    return await service.complete(task_id, confirmed=confirmed, tz_offset=tz_offset)


@router.put("/{task_id}/content", response_model=TaskWithChildrenOut)
async def upsert_task_content(
    task_id: UUID,
    input: UpsertTaskContentInput,
    service: TaskService = Depends(get_task_service),
) -> TaskWithChildrenOut:
    return await service.upsert_content(task_id, input)


@router.delete("/{task_id}/content", response_model=TaskWithChildrenOut)
async def delete_task_content(
    task_id: UUID,
    service: TaskService = Depends(get_task_service),
) -> TaskWithChildrenOut:
    return await service.delete_content(task_id)
