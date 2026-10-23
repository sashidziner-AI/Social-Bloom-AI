from datetime import datetime

from pydantic import BaseModel, field_validator


class PublishJobCreate(BaseModel):
    content_request_id: int
    creative_id: int | None = None
    platform: str
    scheduled_at: datetime | None = None
    publish_target: str = "profile"
    target_org_ids: list[int] | None = None

    @field_validator("publish_target")
    @classmethod
    def validate_publish_target(cls, v: str) -> str:
        allowed = {"profile", "company_page", "both"}
        if v not in allowed:
            raise ValueError(f"publish_target must be one of {allowed}")
        return v

    @field_validator("target_org_ids")
    @classmethod
    def validate_target_org_ids(cls, v: list[int] | None, info) -> list[int] | None:
        target = info.data.get("publish_target", "profile")
        if target in ("company_page", "both") and (not v or len(v) == 0):
            raise ValueError("target_org_ids required when publishing to company page")
        return v


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
    publish_target: str = "profile"
    target_org_ids: list[int] | None = None
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


class LinkedInOrgResponse(BaseModel):
    org_id: str
    name: str
    logo_url: str | None = None

    class Config:
        from_attributes = True


class LinkedInOrgsListResponse(BaseModel):
    items: list[LinkedInOrgResponse]
    missing_scopes: list[str] = []
    has_org_access: bool = True
