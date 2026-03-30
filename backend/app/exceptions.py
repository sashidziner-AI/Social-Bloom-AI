from fastapi import Request
from fastapi.responses import JSONResponse


class AppException(Exception):
    def __init__(self, message: str, code: str, status_code: int = 500):
        self.message = message
        self.code = code
        self.status_code = status_code


class NotFoundError(AppException):
    def __init__(self, resource: str):
        super().__init__(f"{resource} not found", "NOT_FOUND", 404)


class ConflictError(AppException):
    def __init__(self, message: str):
        super().__init__(message, "CONFLICT", 409)


class ForbiddenError(AppException):
    def __init__(self, message: str = "Insufficient permissions"):
        super().__init__(message, "FORBIDDEN", 403)


class BadRequestError(AppException):
    def __init__(self, message: str):
        super().__init__(message, "BAD_REQUEST", 400)


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.message, "code": exc.code},
    )
