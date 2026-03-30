from pydantic import BaseModel

from app.schemas.user import UserResponse


class AdminUserUpdate(BaseModel):
    role: str | None = None
    is_active: bool | None = None


class AdminStatsResponse(BaseModel):
    total_users: int
    total_content_requests: int
    total_published: int
    total_pending_approvals: int


class UserListResponse(BaseModel):
    items: list[UserResponse]
    total: int
    page: int
    per_page: int


class PermissionEntry(BaseModel):
    key: str
    name: str
    role_default: bool
    granted: bool
    is_custom: bool


class PermissionGroupResponse(BaseModel):
    category: str
    permissions: list[PermissionEntry]


class UserPermissionsResponse(BaseModel):
    user_id: int
    role: str
    groups: list[PermissionGroupResponse]


class UserPermissionsUpdate(BaseModel):
    permissions: dict[str, bool]


class RoleDefaultsResponse(BaseModel):
    """Effective role defaults: hardcoded merged with DB overrides."""
    defaults: dict[str, dict[str, bool]]


class RoleDefaultsUpdate(BaseModel):
    role: str
    permissions: dict[str, bool]
