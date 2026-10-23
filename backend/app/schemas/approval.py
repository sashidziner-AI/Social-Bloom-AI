from datetime import datetime

from pydantic import BaseModel


class ApprovalCreate(BaseModel):
    entity_type: str
    entity_id: int


class ApprovalDecision(BaseModel):
    comments: str | None = None


class ApprovalHistoryResponse(BaseModel):
    id: int
    approval_id: int
    action: str
    actor_id: int
    actor_name: str | None = None
    actor_role: str | None = None
    comments: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class ApprovalResponse(BaseModel):
    id: int
    entity_type: str
    entity_id: int
    approval_level: str
    status: str
    reviewer_id: int | None
    comments: str | None
    decided_at: datetime | None
    created_at: datetime
    history: list[ApprovalHistoryResponse] = []

    class Config:
        from_attributes = True


class ApprovalListResponse(BaseModel):
    items: list[ApprovalResponse]
    total: int
    page: int
    per_page: int
