import logging

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.user import UserRole
from app.schemas.audit_log import AuditLogListResponse, AuditLogResponse
from app.services import audit_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/audit-logs", tags=["audit"])


@router.get("/", response_model=AuditLogListResponse)
async def list_logs(
    entity_type: str | None = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _=Depends(require_role(UserRole.admin, UserRole.manager)),
) -> AuditLogListResponse:
    result = audit_service.get_audit_logs(
        db, entity_type=entity_type, page=page, per_page=per_page
    )
    return AuditLogListResponse(
        items=[AuditLogResponse.model_validate(i) for i in result["items"]],
        total=result["total"],
        page=result["page"],
        per_page=result["per_page"],
    )


@router.get("/{entity_type}/{entity_id}", response_model=AuditLogListResponse)
async def get_entity_logs(
    entity_type: str,
    entity_id: int,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
) -> AuditLogListResponse:
    result = audit_service.get_audit_logs(
        db, entity_type=entity_type, entity_id=entity_id, page=page, per_page=per_page
    )
    return AuditLogListResponse(
        items=[AuditLogResponse.model_validate(i) for i in result["items"]],
        total=result["total"],
        page=result["page"],
        per_page=result["per_page"],
    )
