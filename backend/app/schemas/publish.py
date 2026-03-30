from datetime import datetime

from pydantic import BaseModel


class PublishJobCreate(BaseModel):
    content_request_id: int
    creative_id: int | None = None
    platform: str
    scheduled_at: datetime | None = None


class PublishJobResponse(BaseModel):
    id: int
    content_request_id: int
    content_title: str | None = None
    creative_id: int | None
    platform: str
    scheduled_at: datetime | None
    published_at: datetime | None
    status: str
    platform_post_id: str | None
    platform_post_url: str | None
    error_message: str | None
    retry_count: int
    created_by: int
    created_at: datetime
    updated_at: datetime | None

    class Config:
        from_attributes = True


class PublishJobListResponse(BaseModel):
    items: list[PublishJobResponse]
    total: int
    page: int
    per_page: int
