import logging

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.approval import (
    ApprovalCreate,
    ApprovalDecision,
    ApprovalHistoryResponse,
    ApprovalListResponse,
    ApprovalResponse,
)
from app.services import approval_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/approvals", tags=["approvals"])


@router.post("/", response_model=ApprovalResponse, status_code=status.HTTP_201_CREATED)
async def submit(
    data: ApprovalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApprovalResponse:
    approval = approval_service.submit_for_approval(
        db, data.entity_type, data.entity_id, current_user.id
    )
    return ApprovalResponse.model_validate(approval)


@router.get("/", response_model=ApprovalListResponse)
async def list_approvals(
    status_filter: str | None = Query(None, alias="status"),
    level: str | None = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ApprovalListResponse:
    result = approval_service.list_approvals(
        db, status=status_filter, level=level, page=page, per_page=per_page
    )
    return ApprovalListResponse(
        items=[ApprovalResponse.model_validate(i) for i in result["items"]],
        total=result["total"],
        page=result["page"],
        per_page=result["per_page"],
    )


@router.get("/pending/{entity_type}/{entity_id}")
async def get_pending(
    entity_type: str,
    entity_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    approval = approval_service.get_pending_approval(db, entity_type, entity_id)
    if not approval:
        return {"id": None}
    return ApprovalResponse.model_validate(approval)


@router.get("/{approval_id}", response_model=ApprovalResponse)
async def get(
    approval_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ApprovalResponse:
    approval = approval_service.get_approval(db, approval_id)
    return ApprovalResponse.model_validate(approval)


@router.put("/{approval_id}/approve", response_model=ApprovalResponse)
async def approve(
    approval_id: int,
    data: ApprovalDecision,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApprovalResponse:
    approval = approval_service.approve(db, approval_id, current_user, data.comments)
    return ApprovalResponse.model_validate(approval)


@router.put("/{approval_id}/reject", response_model=ApprovalResponse)
async def reject(
    approval_id: int,
    data: ApprovalDecision,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApprovalResponse:
    approval = approval_service.reject(db, approval_id, current_user, data.comments or "")
    return ApprovalResponse.model_validate(approval)


@router.put("/{approval_id}/request-revision", response_model=ApprovalResponse)
async def request_revision(
    approval_id: int,
    data: ApprovalDecision,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApprovalResponse:
    approval = approval_service.request_revision(
        db, approval_id, current_user, data.comments or ""
    )
    return ApprovalResponse.model_validate(approval)


@router.get("/history/{entity_type}/{entity_id}", response_model=list[ApprovalHistoryResponse])
async def get_history(
    entity_type: str,
    entity_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[ApprovalHistoryResponse]:
    history = approval_service.get_history(db, entity_type, entity_id)
    return [ApprovalHistoryResponse.model_validate(h) for h in history]
