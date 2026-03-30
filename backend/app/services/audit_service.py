import logging
from typing import Any

from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog

logger = logging.getLogger(__name__)


def log_action(
    db: Session,
    entity_type: str,
    entity_id: int,
    action: str,
    actor_id: int | None = None,
    details: dict[str, Any] | None = None,
    ip_address: str | None = None,
) -> AuditLog:
    log = AuditLog(
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        actor_id=actor_id,
        details=details,
        ip_address=ip_address,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    logger.info("Audit: %s %s/%d by user %s", action, entity_type, entity_id, actor_id)
    return log


def get_audit_logs(
    db: Session,
    entity_type: str | None = None,
    entity_id: int | None = None,
    page: int = 1,
    per_page: int = 20,
) -> dict:
    query = db.query(AuditLog)
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)
    if entity_id:
        query = query.filter(AuditLog.entity_id == entity_id)

    total = query.count()
    items = (
        query.order_by(AuditLog.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )
    return {"items": items, "total": total, "page": page, "per_page": per_page}
