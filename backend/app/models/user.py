import enum

from sqlalchemy import Boolean, Column, Enum, Integer, String
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.base import TimestampMixin


class UserRole(enum.Enum):
    admin = "admin"
    manager = "manager"
    team_lead = "team_lead"
    creator = "creator"
    designer = "designer"


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=True)
    role = Column(Enum(UserRole), default=UserRole.creator, nullable=False)
    avatar_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)

    refresh_tokens = relationship(
        "RefreshToken", back_populates="user", cascade="all, delete-orphan"
    )
    content_requests = relationship(
        "ContentRequest",
        back_populates="creator",
        foreign_keys="ContentRequest.created_by",
    )
    custom_permissions = relationship(
        "UserPermission", back_populates="user", cascade="all, delete-orphan"
    )
