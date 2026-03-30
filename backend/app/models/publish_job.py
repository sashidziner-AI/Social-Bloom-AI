import enum

from sqlalchemy import Column, Enum, ForeignKey, Integer, String, Text
from sqlalchemy import DateTime
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.base import TimestampMixin
from app.models.content_request import Platform


class PublishStatus(enum.Enum):
    scheduled = "scheduled"
    publishing = "publishing"
    published = "published"
    failed = "failed"
    cancelled = "cancelled"


class PublishJob(Base, TimestampMixin):
    __tablename__ = "publish_jobs"

    id = Column(Integer, primary_key=True, index=True)
    content_request_id = Column(
        Integer,
        ForeignKey("content_requests.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    creative_id = Column(
        Integer,
        ForeignKey("creatives.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    platform = Column(Enum(Platform), nullable=False)
    scheduled_at = Column(DateTime(timezone=True), nullable=True)
    published_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(
        Enum(PublishStatus), default=PublishStatus.scheduled, nullable=False
    )
    platform_post_id = Column(String(255), nullable=True)
    platform_post_url = Column(String(500), nullable=True)
    error_message = Column(Text, nullable=True)
    retry_count = Column(Integer, default=0)
    created_by = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )

    content_request = relationship("ContentRequest", back_populates="publish_jobs")
    creative = relationship("Creative")
    creator = relationship("User", foreign_keys=[created_by])
