import enum

from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base
from app.models.base import TimestampMixin


class CreativeType(enum.Enum):
    image = "image"
    video = "video"
    carousel = "carousel"


class CreativeStatus(enum.Enum):
    pending = "pending"
    generating = "generating"
    generated = "generated"
    designer_review = "designer_review"
    designer_replaced = "designer_replaced"
    submitted = "submitted"
    tl_approved = "tl_approved"
    approved = "approved"
    rejected = "rejected"


class AssetType(enum.Enum):
    image = "image"
    video = "video"


class Creative(Base, TimestampMixin):
    __tablename__ = "creatives"

    id = Column(Integer, primary_key=True, index=True)
    content_request_id = Column(
        Integer,
        ForeignKey("content_requests.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    creative_type = Column(Enum(CreativeType), nullable=False)
    prompt = Column(Text, nullable=True)
    ai_generated_url = Column(String(500), nullable=True)
    designer_uploaded_url = Column(String(500), nullable=True)
    final_url = Column(String(500), nullable=True)
    status = Column(
        Enum(CreativeStatus), default=CreativeStatus.pending, nullable=False
    )
    notes = Column(Text, nullable=True)
    created_by = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    reviewed_by = Column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    assigned_to = Column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )

    content_request = relationship("ContentRequest", back_populates="creatives")
    creator = relationship("User", foreign_keys=[created_by])
    reviewer = relationship("User", foreign_keys=[reviewed_by])
    assignee = relationship("User", foreign_keys=[assigned_to])
    assets = relationship(
        "CreativeAsset", back_populates="creative", cascade="all, delete-orphan"
    )


class CreativeAsset(Base):
    __tablename__ = "creative_assets"

    id = Column(Integer, primary_key=True, index=True)
    creative_id = Column(
        Integer,
        ForeignKey("creatives.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    asset_url = Column(String(500), nullable=False)
    asset_type = Column(Enum(AssetType), nullable=False)
    order_index = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    creative = relationship("Creative", back_populates="assets")
