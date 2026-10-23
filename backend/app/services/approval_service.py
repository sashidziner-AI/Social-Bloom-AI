import logging
import re
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

# Matches the frontend's getBaseTitle() so sibling CRs are identified the same way
_PLATFORM_SUFFIX_RE = re.compile(r"\s*\((Facebook|LinkedIn|Instagram|Twitter/X|Twitter)\)\s*$", re.IGNORECASE)


def _base_title(title: str) -> str:
    return _PLATFORM_SUFFIX_RE.sub("", title or "").strip()


def _sibling_content_requests(db: Session, content_id: int) -> list[ContentRequest]:
    """Return every ContentRequest that belongs to the same poster group.

    Mirrors the frontend grouping key: (baseTitle, topic, tone, created_by).
    The list always includes the original content (if found).
    """
    origin = db.query(ContentRequest).filter(ContentRequest.id == content_id).first()
    if not origin:
        return []
    base = _base_title(origin.title)
    candidates = (
        db.query(ContentRequest)
        .filter(
            ContentRequest.topic == origin.topic,
            ContentRequest.tone == origin.tone,
            ContentRequest.created_by == origin.created_by,
        )
        .all()
    )
    return [c for c in candidates if _base_title(c.title) == base]


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
    """Submit a content_request (or other entity) for first-level approval.

    For content_requests, the same poster usually has multiple platform-specific
    siblings (one CR per platform). We submit ALL siblings together so a single
    approval decision flows across every platform variant.
    """
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

    # Determine the set of entities to submit. For non-content_request, just self.
    if entity_type == EntityType.content_request.value:
        siblings = _sibling_content_requests(db, entity_id) or []
        sibling_ids = [c.id for c in siblings] or [entity_id]
        # Skip siblings that already have a pending approval so we don't violate
        # the "one pending approval per entity" invariant.
        sibling_ids = [
            sid for sid in sibling_ids
            if not db.query(Approval).filter(
                Approval.entity_type == EntityType.content_request,
                Approval.entity_id == sid,
                Approval.status == ApprovalStatus.pending,
            ).first()
        ]
    else:
        sibling_ids = [entity_id]

    primary_approval: Approval | None = None
    for sid in sibling_ids:
        approval = Approval(
            entity_type=EntityType(entity_type),
            entity_id=sid,
            approval_level=ApprovalLevel.team_lead,
            status=ApprovalStatus.pending,
        )
        db.add(approval)
        db.flush()
        _sync_content_status(db, approval, ContentStatus.pending_review)
        db.add(ApprovalHistory(
            approval_id=approval.id,
            action=ApprovalAction.submitted,
            actor_id=user_id,
        ))
        if sid == entity_id:
            primary_approval = approval

    db.commit()
    if primary_approval is None:
        # Shouldn't happen, but guard anyway
        primary_approval = (
            db.query(Approval)
            .filter(Approval.entity_id == entity_id, Approval.entity_type == EntityType(entity_type))
            .order_by(Approval.id.desc())
            .first()
        )
    db.refresh(primary_approval)

    audit_service.log_action(
        db, entity_type, entity_id, "submitted_for_approval", user_id,
        details={"sibling_ids": sibling_ids},
    )
    logger.info(
        "Submitted %s for approval (siblings=%s)",
        entity_type,
        sibling_ids,
    )
    return primary_approval


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


def _generate_image_in_background(
    creative_id: int,
    prompt: str,
    brand_colors: dict | None,
    ph_color: str,
    title_text: str,
    approver_id: int,
    content_request_id: int,
    designer_id: int | None,
) -> None:
    """Run AI image generation in a background thread with its own DB session."""
    import threading
    from app.database import SessionLocal
    from app.services.ai.gemini_service import generate_image

    def _run():
        db2 = SessionLocal()
        try:
            creative = db2.query(Creative).filter(Creative.id == creative_id).first()
            if not creative:
                logger.error("Background gen: creative %d not found", creative_id)
                return

            try:
                image_url = generate_image(prompt=prompt, brand_colors=brand_colors)
                if image_url:
                    creative.ai_generated_url = image_url
                    creative.status = CreativeStatus.generated
                    logger.info("Background: AI image generated for creative %d: %s", creative_id, image_url)
                else:
                    creative.ai_generated_url = (
                        f"https://placehold.co/1080x1080/{ph_color}/FFFFFF"
                        f"?text={title_text}"
                    )
                    creative.status = CreativeStatus.generated
                    logger.warning("Background: placeholder for creative %d", creative_id)
            except Exception as e:
                logger.error("Background: image generation failed for creative %d: %s", creative_id, e)
                creative.ai_generated_url = (
                    f"https://placehold.co/1080x1080/{ph_color}/FFFFFF"
                    f"?text={title_text}"
                )
                creative.status = CreativeStatus.generated

            audit_service.log_action(
                db2, "creative", creative_id,
                "auto_created_on_manager_approval", approver_id,
                details={"content_request_id": content_request_id, "assigned_to": designer_id},
            )
            db2.commit()
        except Exception as e:
            logger.error("Background creative generation thread failed: %s", e)
            db2.rollback()
        finally:
            db2.close()

    t = threading.Thread(target=_run, daemon=True)
    t.start()


def _auto_generate_creative(db: Session, content_request_id: int, approver_id: int) -> None:
    """Auto-create a creative record immediately, then generate the AI image in background."""
    from app.services.creative_service import _build_image_prompt, _extract_brand_colors

    content = (
        db.query(ContentRequest)
        .filter(ContentRequest.id == content_request_id)
        .first()
    )
    if not content:
        logger.error("Content request %d not found for auto creative generation", content_request_id)
        return

    # Skip if a creative already exists for this content request to avoid duplicates
    existing = (
        db.query(Creative)
        .filter(Creative.content_request_id == content_request_id)
        .first()
    )
    if existing:
        logger.info(
            "Creative already exists (%d) for content %d — skipping auto-generation",
            existing.id, content_request_id,
        )
        return

    designer = _find_designer(db)
    ph_color = "6B21A8"

    creative = Creative(
        content_request_id=content_request_id,
        creative_type=CreativeType.image,
        prompt=f"Generating image for: {content.title}",
        status=CreativeStatus.generating,
        created_by=approver_id,
        assigned_to=designer.id if designer else None,
    )
    db.add(creative)

    # Explicitly set the relationship so helpers can read it without a lazy-load race
    creative.content_request = content

    db.flush()
    creative_id = creative.id

    # Build prompt and extract brand colors while content is still in-session
    brand_colors = _extract_brand_colors(creative)
    prompt = _build_image_prompt(creative)
    creative.prompt = prompt

    if brand_colors:
        ph_color = brand_colors['primary_color'].lstrip('#')

    title_text = content.title[:20].replace(' ', '+')

    logger.info(
        "Auto-created creative %d for content %d (background generation starting), assigned to %s",
        creative_id, content_request_id,
        designer.email if designer else "none",
    )

    # Launch image generation in background — approval endpoint returns immediately
    _generate_image_in_background(
        creative_id=creative_id,
        prompt=prompt,
        brand_colors=brand_colors,
        ph_color=ph_color,
        title_text=title_text,
        approver_id=approver_id,
        content_request_id=content_request_id,
        designer_id=designer.id if designer else None,
    )


def approve(
    db: Session, approval_id: int, user: User, comments: str | None = None
) -> Approval:
    """Approve an approval — for content_requests this also approves every
    sibling platform variant's approval at the same level, in lockstep.
    """
    approval = get_approval(db, approval_id)
    if approval.status != ApprovalStatus.pending:
        raise BadRequestError("Approval is not pending")
    _validate_reviewer_role(user, approval)

    # Collect the full set of pending sibling approvals at this level.
    if approval.entity_type == EntityType.content_request:
        sibling_cr_ids = [c.id for c in _sibling_content_requests(db, approval.entity_id)]
        if not sibling_cr_ids:
            sibling_cr_ids = [approval.entity_id]
        approvals_to_decide = (
            db.query(Approval)
            .filter(
                Approval.entity_type == EntityType.content_request,
                Approval.entity_id.in_(sibling_cr_ids),
                Approval.approval_level == approval.approval_level,
                Approval.status == ApprovalStatus.pending,
            )
            .all()
        )
        if approval not in approvals_to_decide:
            approvals_to_decide.append(approval)
    else:
        approvals_to_decide = [approval]

    now = datetime.now(timezone.utc)
    for a in approvals_to_decide:
        a.status = ApprovalStatus.approved
        a.reviewer_id = user.id
        a.comments = comments
        a.decided_at = now
        db.add(ApprovalHistory(
            approval_id=a.id,
            action=ApprovalAction.approved,
            actor_id=user.id,
            comments=comments,
        ))

        if a.approval_level == ApprovalLevel.team_lead:
            _sync_content_status(db, a, ContentStatus.reviewed)
            db.add(Approval(
                entity_type=a.entity_type,
                entity_id=a.entity_id,
                approval_level=ApprovalLevel.manager,
                status=ApprovalStatus.pending,
            ))
        elif a.approval_level == ApprovalLevel.manager:
            _sync_content_status(db, a, ContentStatus.designer_review)
            if a.entity_type == EntityType.content_request:
                _auto_generate_creative(db, a.entity_id, user.id)

    db.commit()
    db.refresh(approval)

    audit_service.log_action(
        db,
        approval.entity_type.value,
        approval.entity_id,
        f"approved_by_{approval.approval_level.value}",
        user.id,
        details={"sibling_approval_ids": [a.id for a in approvals_to_decide]},
    )
    logger.info(
        "Approved %s/%s level=%s siblings=%s",
        approval.entity_type.value,
        approval.entity_id,
        approval.approval_level.value,
        [a.id for a in approvals_to_decide],
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
    from sqlalchemy.orm import joinedload

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
        .options(joinedload(ApprovalHistory.actor))
        .filter(ApprovalHistory.approval_id.in_(approval_ids))
        .order_by(ApprovalHistory.created_at.asc())
        .all()
    )
