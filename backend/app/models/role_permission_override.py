from sqlalchemy import Boolean, Column, Enum, Integer, String, UniqueConstraint

from app.database import Base
from app.models.base import TimestampMixin
from app.models.user import UserRole


class RolePermissionOverride(Base, TimestampMixin):
    __tablename__ = "role_permission_overrides"
    __table_args__ = (
        UniqueConstraint("role", "permission_key", name="uq_role_permission_override"),
    )

    id = Column(Integer, primary_key=True, index=True)
    role = Column(Enum(UserRole), nullable=False, index=True)
    permission_key = Column(String(100), nullable=False)
    granted = Column(Boolean, nullable=False)
