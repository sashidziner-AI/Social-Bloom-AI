from datetime import datetime

from pydantic import BaseModel, Field


class TemplateUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    width: int | None = Field(None, ge=100, le=4096)
    height: int | None = Field(None, ge=100, le=4096)
    bg_color: str | None = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    text_color: str | None = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    heading_font_size: int | None = Field(None, ge=10, le=200)
    body_font_size: int | None = Field(None, ge=8, le=120)
    logo_position: str | None = None
    overlay_opacity: float | None = Field(None, ge=0.0, le=1.0)
    default_cta: str | None = Field(None, max_length=200)
    default_hashtags: str | None = None


class TemplateResponse(BaseModel):
    id: int
    company_id: int
    platform: str
    name: str
    width: int
    height: int
    bg_color: str | None
    text_color: str
    heading_font_size: int
    body_font_size: int
    logo_position: str
    overlay_opacity: float
    default_cta: str | None
    default_hashtags: str | None
    created_at: datetime | None
    updated_at: datetime | None

    class Config:
        from_attributes = True
