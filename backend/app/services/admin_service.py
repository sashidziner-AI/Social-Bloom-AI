import logging

from sqlalchemy.orm import Session

from app.exceptions import BadRequestError, ForbiddenError, NotFoundError
from app.models.approval import Approval, ApprovalStatus
from app.models.content_request import ContentRequest
from app.models.publish_job import PublishJob, PublishStatus
from app.models.role_permission_override import RolePermissionOverride
from app.models.user import User, UserRole
from app.models.user_permission import UserPermission
from app.permissions import PERMISSION_GROUPS, get_all_permission_keys, get_role_defaults
from app.schemas.admin import (
    AdminStatsResponse,
    AdminUserUpdate,
    PermissionEntry,
    PermissionGroupResponse,
    RoleDefaultsResponse,
    RoleDefaultsUpdate,
    UserPermissionsResponse,
)

logger = logging.getLogger(__name__)


def list_users(
    db: Session, page: int = 1, per_page: int = 20, role: str | None = None
) -> dict:
    query = db.query(User)
    if role:
        query = query.filter(User.role == UserRole(role))

    total = query.count()
    items = (
        query.order_by(User.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )
    return {"items": items, "total": total, "page": page, "per_page": per_page}


def update_user(
    db: Session, user_id: int, data: AdminUserUpdate, admin_user_id: int
) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise NotFoundError("User")

    if user_id == admin_user_id and data.role and data.role != "admin":
        raise ForbiddenError("Cannot demote yourself from admin")

    if data.role is not None:
        try:
            user.role = UserRole(data.role)
        except ValueError:
            raise BadRequestError(f"Invalid role: {data.role}")
    if data.is_active is not None:
        user.is_active = data.is_active

    db.commit()
    db.refresh(user)
    logger.info("User %d updated by admin %d", user_id, admin_user_id)
    return user


def deactivate_user(db: Session, user_id: int, admin_user_id: int) -> User:
    if user_id == admin_user_id:
        raise ForbiddenError("Cannot deactivate yourself")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise NotFoundError("User")

    user.is_active = False
    db.commit()
    db.refresh(user)
    logger.info("User %d deactivated by admin %d", user_id, admin_user_id)
    return user


def get_platform_stats(db: Session) -> AdminStatsResponse:
    total_users = db.query(User).count()
    total_content_requests = db.query(ContentRequest).count()
    total_published = (
        db.query(PublishJob).filter(PublishJob.status == PublishStatus.published).count()
    )
    total_pending_approvals = (
        db.query(Approval).filter(Approval.status == ApprovalStatus.pending).count()
    )
    return AdminStatsResponse(
        total_users=total_users,
        total_content_requests=total_content_requests,
        total_published=total_published,
        total_pending_approvals=total_pending_approvals,
    )


def get_user_permissions(db: Session, user_id: int) -> UserPermissionsResponse:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise NotFoundError("User")

    role_str = user.role.value if hasattr(user.role, "value") else user.role
    effective_role_defaults = _get_effective_role_defaults(db, role_str)

    overrides = (
        db.query(UserPermission).filter(UserPermission.user_id == user_id).all()
    )
    override_map = {o.permission_key: o.granted for o in overrides}

    groups = []
    for group in PERMISSION_GROUPS:
        entries = []
        for perm in group["permissions"]:
            key = perm["key"]
            role_default = effective_role_defaults.get(key, False)
            is_custom = key in override_map
            granted = override_map[key] if is_custom else role_default
            entries.append(
                PermissionEntry(
                    key=key,
                    name=perm["name"],
                    role_default=role_default,
                    granted=granted,
                    is_custom=is_custom,
                )
            )
        groups.append(PermissionGroupResponse(category=group["category"], permissions=entries))

    return UserPermissionsResponse(user_id=user_id, role=role_str, groups=groups)


def update_user_permissions(
    db: Session, user_id: int, permissions: dict[str, bool]
) -> UserPermissionsResponse:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise NotFoundError("User")

    role_str = user.role.value if hasattr(user.role, "value") else user.role
    effective_role_defaults = _get_effective_role_defaults(db, role_str)
    valid_keys = set(get_all_permission_keys())

    # Delete existing overrides for this user
    db.query(UserPermission).filter(UserPermission.user_id == user_id).delete()

    # Only store overrides that differ from effective role defaults
    for key, granted in permissions.items():
        if key not in valid_keys:
            continue
        if granted != effective_role_defaults.get(key, False):
            db.add(UserPermission(user_id=user_id, permission_key=key, granted=granted))

    db.commit()
    logger.info("Permissions updated for user %d", user_id)
    return get_user_permissions(db, user_id)


def get_permission_registry() -> list[dict]:
    """Return the full permission structure for the frontend."""
    return PERMISSION_GROUPS


def _get_effective_role_defaults(db: Session, role_str: str) -> dict[str, bool]:
    """Return effective defaults for a role: hardcoded merged with DB overrides."""
    hardcoded = get_role_defaults(role_str)

    try:
        role_enum = UserRole(role_str)
    except ValueError:
        return hardcoded

    overrides = (
        db.query(RolePermissionOverride)
        .filter(RolePermissionOverride.role == role_enum)
        .all()
    )
    for override in overrides:
        if override.permission_key in hardcoded:
            hardcoded[override.permission_key] = override.granted

    return hardcoded


def get_role_defaults_with_overrides(db: Session) -> RoleDefaultsResponse:
    """Return effective role defaults for all roles (hardcoded + DB overrides)."""
    defaults: dict[str, dict[str, bool]] = {}
    for role in UserRole:
        defaults[role.value] = _get_effective_role_defaults(db, role.value)
    return RoleDefaultsResponse(defaults=defaults)


def update_role_defaults(
    db: Session, data: RoleDefaultsUpdate
) -> RoleDefaultsResponse:
    """Upsert role-level permission overrides. Only stores diffs from hardcoded defaults."""
    try:
        role_enum = UserRole(data.role)
    except ValueError:
        raise BadRequestError(f"Invalid role: {data.role}")

    hardcoded = get_role_defaults(data.role)
    valid_keys = set(get_all_permission_keys())

    # Delete all existing overrides for this role
    db.query(RolePermissionOverride).filter(
        RolePermissionOverride.role == role_enum
    ).delete()

    # Only store overrides that differ from the hardcoded defaults
    for key, granted in data.permissions.items():
        if key not in valid_keys:
            continue
        if granted != hardcoded.get(key, False):
            db.add(
                RolePermissionOverride(
                    role=role_enum, permission_key=key, granted=granted
                )
            )

    db.commit()
    logger.info("Role defaults updated for role %s", data.role)
    return get_role_defaults_with_overrides(db)


def check_user_permission(db: Session, user: User, permission_key: str) -> bool:
    """Check if a user has a specific permission.

    Priority: user-level override > role-level DB override > hardcoded default.
    """
    # 1. Check user-level override first
    user_override = (
        db.query(UserPermission)
        .filter(
            UserPermission.user_id == user.id,
            UserPermission.permission_key == permission_key,
        )
        .first()
    )
    if user_override is not None:
        return user_override.granted

    # 2. Check role-level DB override
    role_str = user.role.value if hasattr(user.role, "value") else user.role
    try:
        role_enum = UserRole(role_str)
    except ValueError:
        return get_role_defaults(role_str).get(permission_key, False)

    role_override = (
        db.query(RolePermissionOverride)
        .filter(
            RolePermissionOverride.role == role_enum,
            RolePermissionOverride.permission_key == permission_key,
        )
        .first()
    )
    if role_override is not None:
        return role_override.granted

    # 3. Fall back to hardcoded defaults
    return get_role_defaults(role_str).get(permission_key, False)
