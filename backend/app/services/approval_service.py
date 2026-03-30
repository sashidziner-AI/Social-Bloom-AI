import logging
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.exceptions import BadRequestError, ForbiddenError, NotFoundError
from app.models.approval import (
    Approval,
    ApprovalAction,
    ApprovalHistory,
    ApprovalLevel,
    ApprovalStatus,
    EntityType,
)
from app.models.content_request import ContentRequest, ContentStatus
from app.models.creative import Creative, CreativeStatus, CreativeType
from app.models.user import User, UserRole
from app.services import audit_service

logger = logging.getLogger(__name__)


def _sync_content_status(db: Session, approval: Approval, new_status: ContentStatus) -> None:
    """Update the linked content request status when an approval decision is made."""
    if approval.entity_type != EntityType.content_request:
        return
    content = db.query(ContentRequest).filter(ContentRequest.id == approval.entity_id).first()
    if content:
        content.status = new_status
        logger.info(
            "Content request %d status synced to %s", content.id, new_status.value
        )


def submit_for_approval(
    db: Session, entity_type: str, entity_id: int, user_id: int
) -> Approval:
    EntityType(entity_type)

    existing = (
        db.query(Approval)
        .filter(
            Approval.entity_type == EntityType(entity_type),
            Approval.entity_id == entity_id,
            Approval.status == ApprovalStatus.pending,
        )
        .first()
    )
    if existing:
        raise BadRequestError("Item already has a pending approval")

    approval = Approval(
        entity_type=EntityType(entity_type),
        entity_id=entity_id,
        approval_level=ApprovalLevel.team_lead,
        status=ApprovalStatus.pending,
    )
    db.add(approval)
    db.flush()

    # Set content status to pending_review
    _sync_content_status(db, approval, ContentStatus.pending_review)

    history = ApprovalHistory(
        approval_id=approval.id,
        action=ApprovalAction.submitted,
        actor_id=user_id,
    )
    db.add(history)
    db.commit()
    db.refresh(approval)

    audit_service.log_action(
        db, entity_type, entity_id, "submitted_for_approval", user_id
    )
    logger.info("Submitted %s/%d for approval", entity_type, entity_id)
    return approval


def get_approval(db: Session, approval_id: int) -> Approval:
    approval = db.query(Approval).filter(Approval.id == approval_id).first()
    if not approval:
        raise NotFoundError("Approval")
    return approval


def list_approvals(
    db: Session,
    status: str | None = None,
    level: str | None = None,
    reviewer_id: int | None = None,
    page: int = 1,
    per_page: int = 20,
) -> dict:
    query = db.query(Approval)
    if status:
        query = query.filter(Approval.status == ApprovalStatus(status))
    if level:
        query = query.filter(Approval.approval_level == ApprovalLevel(level))
    if reviewer_id:
        query = query.filter(Approval.reviewer_id == reviewer_id)

    total = query.count()
    items = (
        query.order_by(Approval.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )
    return {"items": items, "total": total, "page": page, "per_page": per_page}


def _validate_reviewer_role(user: User, approval: Approval) -> None:
    level = approval.approval_level
    role = user.role
    if level == ApprovalLevel.team_lead and role not in (
        UserRole.team_lead,
        UserRole.manager,
        UserRole.admin,
    ):
        raise ForbiddenError("Only team leads, managers, or admins can approve at this level")
    if level == ApprovalLevel.manager and role not in (
        UserRole.manager,
        UserRole.admin,
    ):
        raise ForbiddenError("Only managers or admins can approve at this level")


def _find_designer(db: Session) -> User | None:
    """Find the active designer with the least assigned creatives (load-balanced)."""
    from sqlalchemy import func

    designers = (
        db.query(User)
        .filter(User.role == UserRole.designer, User.is_active.is_(True))
        .all()
    )
    if not designers:
        return None
    if len(designers) == 1:
        return designers[0]

    # Pick the designer with the fewest active (non-approved) creatives
    least_loaded = None
    min_count = float("inf")
    for d in designers:
        count = (
            db.query(func.count(Creative.id))
            .filter(
                Creative.assigned_to == d.id,
                Creative.status.notin_(["approved", "rejected"]),
            )
            .scalar()
        ) or 0
        if count < min_count:
            min_count = count
            least_loaded = d

    return least_loaded


def _auto_generate_creative(db: Session, content_request_id: int, approver_id: int) -> None:
    """Auto-create a creative, generate AI image synchronously, and assign to a designer."""
    from app.services.ai.gemini_service import generate_image
    from app.services.creative_service import _build_image_prompt

    content = (
        db.query(ContentRequest)
        .filter(ContentRequest.id == content_request_id)
        .first()
    )
    if not content:
        logger.error("Content request %d not found for auto creative generation", content_request_id)
        return

    designer = _find_designer(db)

    creative = Creative(
        content_request_id=content_request_id,
        creative_type=CreativeType.image,
        prompt=f"Generating image for: {content.title}",
        status=CreativeStatus.generating,
        created_by=approver_id,
        assigned_to=designer.id if designer else None,
    )
    db.add(creative)
    db.flush()

    creative_id = creative.id
    logger.info(
        "Auto-created creative %d for content %d, assigned to designer %s",
        creative_id, content_request_id,
        designer.email if designer else "none",
    )

    # Build prompt from all content fields
    prompt = _build_image_prompt(creative)
    creative.prompt = prompt

    # Generate image synchronously — try API, fallback to placeholder immediately
    try:
        image_url = generate_image(prompt=prompt)
        if image_url:
            creative.ai_generated_url = image_url
            creative.status = CreativeStatus.generated
            logger.info("AI image generated for creative %d: %s", creative_id, image_url)
        else:
            creative.ai_generated_url = f"https://placehold.co/1080x1080/6B21A8/FFFFFF?text={content.title[:20].replace(' ', '+')}"
            creative.status = CreativeStatus.generated
            logger.warning("Using placeholder for creative %d", creative_id)
    except Exception as e:
        logger.error("Image generation failed for creative %d: %s", creative_id, e)
        creative.ai_generated_url = f"https://placehold.co/1080x1080/6B21A8/FFFFFF?text={content.title[:20].replace(' ', '+')}"
        creative.status = CreativeStatus.generated

    audit_service.log_action(
        db, "creative", creative_id,
        "auto_created_on_manager_approval", approver_id,
        details={"content_request_id": content_request_id, "assigned_to": designer.id if designer else None},
    )


def approve(
    db: Session, approval_id: int, user: User, comments: str | None = None
) -> Approval:
    approval = get_approval(db, approval_id)
    if approval.status != ApprovalStatus.pending:
        raise BadRequestError("Approval is not pending")
    _validate_reviewer_role(user, approval)

    approval.status = ApprovalStatus.approved
    approval.reviewer_id = user.id
    approval.comments = comments
    approval.decided_at = datetime.now(timezone.utc)

    history = ApprovalHistory(
        approval_id=approval.id,
        action=ApprovalAction.approved,
        actor_id=user.id,
        comments=comments,
    )
    db.add(history)

    # Auto-escalate: if team_lead approved, create manager-level approval
    if approval.approval_level == ApprovalLevel.team_lead:
        _sync_content_status(db, approval, ContentStatus.reviewed)
        manager_approval = Approval(
            entity_type=approval.entity_type,
            entity_id=approval.entity_id,
            approval_level=ApprovalLevel.manager,
            status=ApprovalStatus.pending,
        )
        db.add(manager_approval)
    elif approval.approval_level == ApprovalLevel.manager:
        # Manager approved → auto-generate creative and assign to designer
        _sync_content_status(db, approval, ContentStatus.designer_review)
        if approval.entity_type == EntityType.content_request:
            _auto_generate_creative(db, approval.entity_id, user.id)

    db.commit()
    db.refresh(approval)

    audit_service.log_action(
        db,
        approval.entity_type.value,
        approval.entity_id,
        f"approved_by_{approval.approval_level.value}",
        user.id,
    )
    return approval


def reject(
    db: Session, approval_id: int, user: User, comments: str
) -> Approval:
    if not comments:
        raise BadRequestError("Comments are required for rejection")

    approval = get_approval(db, approval_id)
    if approval.status != ApprovalStatus.pending:
        raise BadRequestError("Approval is not pending")
    _validate_reviewer_role(user, approval)

    approval.status = ApprovalStatus.rejected
    approval.reviewer_id = user.id
    approval.comments = comments
    approval.decided_at = datetime.now(timezone.utc)

    # Send content back to creator for revisions
    _sync_content_status(db, approval, ContentStatus.revision_requested)

    history = ApprovalHistory(
        approval_id=approval.id,
        action=ApprovalAction.rejected,
        actor_id=user.id,
        comments=comments,
    )
    db.add(history)
    db.commit()
    db.refresh(approval)

    audit_service.log_action(
        db,
        approval.entity_type.value,
        approval.entity_id,
        f"rejected_by_{approval.approval_level.value}",
        user.id,
        details={"comments": comments},
    )
    return approval


def request_revision(
    db: Session, approval_id: int, user: User, comments: str
) -> Approval:
    if not comments:
        raise BadRequestError("Comments are required for revision request")

    approval = get_approval(db, approval_id)
    if approval.status != ApprovalStatus.pending:
        raise BadRequestError("Approval is not pending")
    _validate_reviewer_role(user, approval)

    approval.status = ApprovalStatus.revision_requested
    approval.reviewer_id = user.id
    approval.comments = comments
    approval.decided_at = datetime.now(timezone.utc)

    # Send content back to creator for revisions
    _sync_content_status(db, approval, ContentStatus.revision_requested)

    history = ApprovalHistory(
        approval_id=approval.id,
        action=ApprovalAction.revision_requested,
        actor_id=user.id,
        comments=comments,
    )
    db.add(history)
    db.commit()
    db.refresh(approval)

    audit_service.log_action(
        db,
        approval.entity_type.value,
        approval.entity_id,
        f"revision_requested_by_{approval.approval_level.value}",
        user.id,
        details={"comments": comments},
    )
    return approval


def get_pending_approval(
    db: Session, entity_type: str, entity_id: int
) -> Approval | None:
    """Find the current pending approval for an entity."""
    return (
        db.query(Approval)
        .filter(
            Approval.entity_type == EntityType(entity_type),
            Approval.entity_id == entity_id,
            Approval.status == ApprovalStatus.pending,
        )
        .first()
    )


def get_history(db: Session, entity_type: str, entity_id: int) -> list[ApprovalHistory]:
    approvals = (
        db.query(Approval)
        .filter(
            Approval.entity_type == EntityType(entity_type),
            Approval.entity_id == entity_id,
        )
        .all()
    )
    approval_ids = [a.id for a in approvals]
    return (
        db.query(ApprovalHistory)
        .filter(ApprovalHistory.approval_id.in_(approval_ids))
        .order_by(ApprovalHistory.created_at.asc())
        .all()
    )
