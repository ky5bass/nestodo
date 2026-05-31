from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from os import getenv

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.api import router
from app.db import Base, engine
from app.errors import AppError, app_error_handler


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    if getenv("CREATE_TABLES_ON_STARTUP") == "1":
        import app.models  # noqa: F401

        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(title="nestodo API", lifespan=lifespan)
app.include_router(router)


async def app_error_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    if not isinstance(exc, AppError):
        raise exc
    return await app_error_handler(request, exc)


app.add_exception_handler(AppError, app_error_exception_handler)


@app.exception_handler(RequestValidationError)
async def request_validation_error_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=400,
        content={
            "error": {
                "code": "validation_error",
                "message": "入力値が不正です",
                "details": exc.errors(),
            }
        },
    )
