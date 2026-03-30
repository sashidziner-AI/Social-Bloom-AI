import enum

from sqlalchemy import Column, DateTime, Enum, ForeignKey, Index, Integer, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class EntityType(enum.Enum):
    content_request = "content_request"
    creative = "creative"


class ApprovalLevel(enum.Enum):
    team_lead = "team_lead"
    manager = "manager"


class ApprovalStatus(enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    revision_requested = "revision_requested"


class ApprovalAction(enum.Enum):
    submitted = "submitted"
    approved = "approved"
    rejected = "rejected"
    revision_requested = "revision_requested"


class Approval(Base):
    __tablename__ = "approvals"

    id = Column(Integer, primary_key=True, index=True)
    entity_type = Column(Enum(EntityType), nullable=False)
    entity_id = Column(Integer, nullable=False, index=True)
    approval_level = Column(Enum(ApprovalLevel), nullable=False)
    status = Column(
        Enum(ApprovalStatus), default=ApprovalStatus.pending, nullable=False
    )
    reviewer_id = Column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    comments = Column(Text, nullable=True)
    decided_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    reviewer = relationship("User", foreign_keys=[reviewer_id])
    history = relationship(
        "ApprovalHistory", back_populates="approval", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_approvals_entity", "entity_type", "entity_id"),
        Index("ix_approvals_status_level", "status", "approval_level"),
    )


class ApprovalHistory(Base):
    __tablename__ = "approval_history"

    id = Column(Integer, primary_key=True, index=True)
    approval_id = Column(
        Integer,
        ForeignKey("approvals.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    action = Column(Enum(ApprovalAction), nullable=False)
    actor_id = Column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=False
    )
    comments = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    approval = relationship("Approval", back_populates="history")
    actor = relationship("User", foreign_keys=[actor_id])
