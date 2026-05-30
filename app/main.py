from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.api import router
from app.errors import AppError, app_error_handler


app = FastAPI(title="nestodo API")
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
