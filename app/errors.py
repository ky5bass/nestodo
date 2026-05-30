from __future__ import annotations

from typing import Any

from fastapi import Request
from fastapi.responses import JSONResponse


class AppError(Exception):
    status_code = 400
    code = "validation_error"

    def __init__(self, message: str, details: Any | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.details = details


class ValidationAppError(AppError):
    code = "validation_error"


class RootEventAtRequiredError(AppError):
    code = "root_event_at_required"

    def __init__(self) -> None:
        super().__init__("Root_Taskにはevent_atが必須です")


class InvalidTimezoneOffsetError(AppError):
    code = "invalid_tz_offset"

    def __init__(self) -> None:
        super().__init__("tz_offsetは-720〜840の分単位の値で指定してください")


class NotFoundError(AppError):
    status_code = 404
    code = "not_found"


class HierarchyLimitError(AppError):
    code = "hierarchy_limit"


class StatusConflictError(AppError):
    code = "status_conflict"


class TransactionError(AppError):
    status_code = 500
    code = "transaction_error"


async def app_error_handler(_: Request, exc: AppError) -> JSONResponse:
    payload: dict[str, Any] = {
        "error": {
            "code": exc.code,
            "message": exc.message,
        }
    }
    if exc.details is not None:
        payload["error"]["details"] = exc.details
    return JSONResponse(status_code=exc.status_code, content=payload)
