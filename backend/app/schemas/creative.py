from datetime import datetime

from pydantic import BaseModel


class CreativeCreate(BaseModel):
    content_request_id: int
    creative_type: str
    prompt: str | None = None


class CreativeUpdate(BaseModel):
    prompt: str | None = None
    notes: str | None = None


class CreativeStatusUpdate(BaseModel):
    status: str


class UploadReplacement(BaseModel):
    designer_uploaded_url: str


class CreativeResponse(BaseModel):
    id: int
    content_request_id: int
    creative_type: str
    prompt: str | None
    ai_generated_url: str | None
    designer_uploaded_url: str | None
    final_url: str | None
    status: str
    notes: str | None
    created_by: int
    reviewed_by: int | None
    assigned_to: int | None
    created_at: datetime
    updated_at: datetime | None

    class Config:
        from_attributes = True


class CreativeListResponse(BaseModel):
    items: list[CreativeResponse]
    total: int
    page: int
    per_page: int
