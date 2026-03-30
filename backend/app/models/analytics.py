from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer
from sqlalchemy import Enum as SAEnum
from sqlalchemy.sql import func

from app.database import Base
from app.models.content_request import Platform


class Analytics(Base):
    __tablename__ = "analytics"

    id = Column(Integer, primary_key=True, index=True)
    content_request_id = Column(
        Integer,
        ForeignKey("content_requests.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    platform = Column(SAEnum(Platform), nullable=False)
    impressions = Column(Integer, default=0)
    clicks = Column(Integer, default=0)
    likes = Column(Integer, default=0)
    shares = Column(Integer, default=0)
    comments_count = Column(Integer, default=0)
    engagement_rate = Column(Float, default=0.0)
    fetched_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
