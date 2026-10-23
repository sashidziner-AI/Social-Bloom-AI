from sqlalchemy import Column, Integer, String

from app.database import Base
from app.models.base import TimestampMixin


class LinkedInOrganization(Base, TimestampMixin):
    __tablename__ = "linkedin_organizations"

    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    logo_url = Column(String(500), nullable=True)
    vanity_name = Column(String(255), nullable=True)
