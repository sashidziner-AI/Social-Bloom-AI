from datetime import datetime

from pydantic import BaseModel, Field


class CompanyCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    primary_color: str = Field(default="#6B21A8", pattern=r"^#[0-9A-Fa-f]{6}$")
    secondary_color: str = Field(default="#EC4899", pattern=r"^#[0-9A-Fa-f]{6}$")
    font_family: str = Field(default="Inter", max_length=100)


class CompanyUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    primary_color: str | None = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    secondary_color: str | None = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    font_family: str | None = Field(None, max_length=100)


class CompanyResponse(BaseModel):
    id: int
    name: str
    logo_url: str | None
    primary_color: str
    secondary_color: str
    font_family: str
    created_by: int
    created_at: datetime | None
    updated_at: datetime | None

    class Config:
        from_attributes = True


class CompanyListResponse(BaseModel):
    items: list[CompanyResponse]
    total: int
    page: int
    per_page: int
