import enum

from sqlalchemy import Column, Enum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.base import TimestampMixin


class TemplatePlatform(enum.Enum):
    linkedin = "linkedin"
    instagram = "instagram"
    facebook = "facebook"


class LogoPosition(enum.Enum):
    top_left = "top_left"
    top_right = "top_right"
    bottom_left = "bottom_left"
    bottom_right = "bottom_right"
    center = "center"


# Default canvas sizes per platform
PLATFORM_DEFAULTS = {
    "linkedin": {"width": 1200, "height": 627, "name": "LinkedIn Default"},
    "instagram": {"width": 1080, "height": 1080, "name": "Instagram Default"},
    "facebook": {"width": 1200, "height": 630, "name": "Facebook Default"},
}


class CompanyTemplate(Base, TimestampMixin):
    __tablename__ = "company_templates"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(
        Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True
    )
    platform = Column(Enum(TemplatePlatform), nullable=False)
    name = Column(String(255), nullable=False)

    # Canvas
    width = Column(Integer, nullable=False, default=1200)
    height = Column(Integer, nullable=False, default=630)

    # Colors (inherit from company by default, but can override)
    bg_color = Column(String(7), nullable=True)
    text_color = Column(String(7), nullable=False, default="#FFFFFF")
    heading_font_size = Column(Integer, nullable=False, default=48)
    body_font_size = Column(Integer, nullable=False, default=24)

    # Layout
    logo_position = Column(Enum(LogoPosition), default=LogoPosition.top_left, nullable=False)
    overlay_opacity = Column(Float, default=0.4, nullable=False)

    # Content defaults
    default_cta = Column(String(200), nullable=True)
    default_hashtags = Column(Text, nullable=True)

    company = relationship("Company", back_populates="templates")
