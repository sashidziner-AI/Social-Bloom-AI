from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.base import TimestampMixin


class Company(Base, TimestampMixin):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    logo_url = Column(String(500), nullable=True)
    primary_color = Column(String(7), nullable=False, default="#6B21A8")
    secondary_color = Column(String(7), nullable=False, default="#EC4899")
    font_family = Column(String(100), nullable=False, default="Inter")
    created_by = Column(Integer, nullable=False)

    templates = relationship(
        "CompanyTemplate", back_populates="company", cascade="all, delete-orphan"
    )
