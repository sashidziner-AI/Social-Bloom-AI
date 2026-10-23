from datetime import datetime

from pydantic import BaseModel


class ContentRequestCreate(BaseModel):
    title: str
    platform: str
    tone: str
    target_audience: str | None = None
    topic: str
    keywords: list[str] = []
    company_id: int | None = None


class ContentRequestUpdate(BaseModel):
    title: str | None = None
    platform: str | None = None
    tone: str | None = None
    target_audience: str | None = None
    topic: str | None = None
    keywords: list[str] | None = None
    generated_caption: str | None = None
    generated_description: str | None = None
    generated_hashtags: list[str] | None = None


class StatusUpdate(BaseModel):
    status: str


class ContentRequestResponse(BaseModel):
    id: int
    title: str
    platform: str
    tone: str
    target_audience: str | None
    topic: str
    keywords: list[str]
    generated_caption: str | None
    generated_description: str | None
    generated_hashtags: list[str]
    status: str
    company_id: int | None
    created_by: int
    assigned_to: int | None
    created_at: datetime
    updated_at: datetime | None

    class Config:
        from_attributes = True


class ContentRequestListResponse(BaseModel):
    items: list[ContentRequestResponse]
    total: int
    page: int
    per_page: int
