import enum

from sqlalchemy import Column, Enum, ForeignKey, Index, Integer, JSON, String, Text
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.base import TimestampMixin


class Platform(enum.Enum):
    facebook = "facebook"
    linkedin = "linkedin"
    instagram = "instagram"
    twitter = "twitter"


class Tone(enum.Enum):
    professional = "professional"
    casual = "casual"
    humorous = "humorous"
    inspirational = "inspirational"
    educational = "educational"


class ContentStatus(enum.Enum):
    draft = "draft"
    pending_review = "pending_review"
    reviewed = "reviewed"
    approved = "approved"
    designer_review = "designer_review"
    rejected = "rejected"
    revision_requested = "revision_requested"
    confirmed = "confirmed"
    published = "published"


class ContentRequest(Base, TimestampMixin):
    __tablename__ = "content_requests"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    platform = Column(Enum(Platform), nullable=False)
    tone = Column(Enum(Tone), nullable=False)
    target_audience = Column(String(200), nullable=True)
    topic = Column(Text, nullable=False)
    keywords = Column(JSON, default=list)
    generated_caption = Column(Text, nullable=True)
    generated_description = Column(Text, nullable=True)
    generated_hashtags = Column(JSON, default=list)
    status = Column(Enum(ContentStatus), default=ContentStatus.draft, nullable=False)
    company_id = Column(
        Integer, ForeignKey("companies.id", ondelete="SET NULL"), nullable=True, index=True
    )
    created_by = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    assigned_to = Column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )

    company = relationship("Company", foreign_keys=[company_id])
    creator = relationship("User", foreign_keys=[created_by], back_populates="content_requests")
    assignee = relationship("User", foreign_keys=[assigned_to])
    creatives = relationship(
        "Creative", back_populates="content_request", cascade="all, delete-orphan"
    )
    publish_jobs = relationship(
        "PublishJob", back_populates="content_request", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_content_requests_status_platform", "status", "platform"),
    )
