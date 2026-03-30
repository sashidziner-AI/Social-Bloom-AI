import logging

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_role
from app.models.user import User, UserRole
from app.schemas.admin import (
    AdminStatsResponse,
    AdminUserUpdate,
    RoleDefaultsResponse,
    RoleDefaultsUpdate,
    UserListResponse,
    UserPermissionsResponse,
    UserPermissionsUpdate,
)
from app.schemas.user import UserResponse
from app.services import admin_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users", response_model=UserListResponse)
async def list_users(
    role: str | None = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin)),
) -> UserListResponse:
    result = admin_service.list_users(db, page=page, per_page=per_page, role=role)
    return UserListResponse(
        items=[UserResponse.model_validate(i) for i in result["items"]],
        total=result["total"],
        page=result["page"],
        per_page=result["per_page"],
    )


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    data: AdminUserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
) -> UserResponse:
    user = admin_service.update_user(db, user_id, data, current_user.id)
    return UserResponse.model_validate(user)


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
) -> None:
    admin_service.deactivate_user(db, user_id, current_user.id)


@router.get("/stats", response_model=AdminStatsResponse)
async def get_stats(
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin)),
) -> AdminStatsResponse:
    return admin_service.get_platform_stats(db)


@router.get("/permissions/registry")
async def get_permission_registry(
    _: User = Depends(require_role(UserRole.admin)),
) -> list[dict]:
    return admin_service.get_permission_registry()


@router.get("/users/{user_id}/permissions", response_model=UserPermissionsResponse)
async def get_user_permissions(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin)),
) -> UserPermissionsResponse:
    return admin_service.get_user_permissions(db, user_id)


@router.put("/users/{user_id}/permissions", response_model=UserPermissionsResponse)
async def update_user_permissions(
    user_id: int,
    data: UserPermissionsUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin)),
) -> UserPermissionsResponse:
    return admin_service.update_user_permissions(db, user_id, data.permissions)


@router.get("/permissions/role-defaults", response_model=RoleDefaultsResponse)
async def get_role_defaults(
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin)),
) -> RoleDefaultsResponse:
    return admin_service.get_role_defaults_with_overrides(db)


@router.put("/permissions/role-defaults", response_model=RoleDefaultsResponse)
async def update_role_defaults(
    data: RoleDefaultsUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin)),
) -> RoleDefaultsResponse:
    return admin_service.update_role_defaults(db, data)
