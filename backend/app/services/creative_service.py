import logging

from sqlalchemy.orm import Session

from app.exceptions import BadRequestError, ForbiddenError, NotFoundError
from app.models.creative import Creative, CreativeStatus, CreativeType
from app.schemas.creative import CreativeCreate, CreativeUpdate

logger = logging.getLogger(__name__)


def create_creative(db: Session, data: CreativeCreate, user_id: int) -> Creative:
    CreativeType(data.creative_type)

    creative = Creative(
        content_request_id=data.content_request_id,
        creative_type=CreativeType(data.creative_type),
        prompt=data.prompt,
        created_by=user_id,
    )
    db.add(creative)
    db.commit()
    db.refresh(creative)
    logger.info("Creative created: %d for content %d", creative.id, data.content_request_id)
    return creative


def get_creative(db: Session, creative_id: int) -> Creative:
    creative = db.query(Creative).filter(Creative.id == creative_id).first()
    if not creative:
        raise NotFoundError("Creative")
    return creative


def list_creatives(
    db: Session,
    content_request_id: int | None = None,
    status: str | None = None,
    creative_type: str | None = None,
    assigned_to: int | None = None,
    page: int = 1,
    per_page: int = 20,
) -> dict:
    query = db.query(Creative)
    if content_request_id:
        query = query.filter(Creative.content_request_id == content_request_id)
    if status:
        query = query.filter(Creative.status == CreativeStatus(status))
    if creative_type:
        query = query.filter(Creative.creative_type == CreativeType(creative_type))
    if assigned_to:
        query = query.filter(Creative.assigned_to == assigned_to)

    total = query.count()
    items = (
        query.order_by(Creative.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )
    return {"items": items, "total": total, "page": page, "per_page": per_page}


def update_creative(
    db: Session, creative_id: int, data: CreativeUpdate, user_id: int
) -> Creative:
    creative = get_creative(db, creative_id)
    if creative.created_by != user_id:
        raise ForbiddenError("Only the owner can edit this creative")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(creative, field, value)

    db.commit()
    db.refresh(creative)
    return creative


def delete_creative(db: Session, creative_id: int, user_id: int) -> None:
    creative = get_creative(db, creative_id)
    if creative.created_by != user_id:
        raise ForbiddenError("Only the owner can delete this creative")
    if creative.status not in (CreativeStatus.pending, CreativeStatus.rejected):
        raise BadRequestError("Only pending or rejected creatives can be deleted")

    db.delete(creative)
    db.commit()
    logger.info("Creative deleted: %d", creative_id)


def _build_image_prompt(creative: Creative) -> str:
    """Build a structured image generation prompt from all content request fields.

    This is the single source of truth for image prompt construction.
    Used by both generate_creative() and approval_service._auto_generate_creative().
    """
    from app.services.ai.gemini_service import build_social_media_image_prompt

    cr = creative.content_request
    if not cr:
        return creative.prompt or "A professional social media post image"

    platform = cr.platform.value if hasattr(cr.platform, "value") else cr.platform
    tone = cr.tone.value if hasattr(cr.tone, "value") else cr.tone

    return build_social_media_image_prompt(
        title=cr.title,
        topic=cr.topic,
        platform=platform,
        tone=tone,
        target_audience=cr.target_audience,
        caption=cr.generated_caption,
        description=cr.generated_description,
        keywords=cr.keywords,
        hashtags=cr.generated_hashtags,
    )


def generate_creative(db: Session, creative_id: int, user_id: int) -> Creative:
    from app.services.ai.gemini_service import generate_image

    creative = get_creative(db, creative_id)
    creative.status = CreativeStatus.generating
    db.commit()

    # Build a rich prompt from ALL content request fields
    prompt = _build_image_prompt(creative)

    # Update the creative's prompt field so the designer can see what was used
    creative.prompt = prompt
    db.commit()

    try:
        image_url = generate_image(prompt=prompt)

        if image_url:
            creative.ai_generated_url = image_url
            creative.status = CreativeStatus.generated
            logger.info("Gemini AI image generated for creative %d: %s", creative_id, image_url)
        else:
            creative.ai_generated_url = f"https://placehold.co/1080x1080/purple/white?text=AI+Creative+{creative_id}"
            creative.status = CreativeStatus.generated
            logger.warning("Gemini returned no image, using placeholder for creative %d", creative_id)
    except Exception as e:
        logger.error("AI image generation failed for creative %d: %s", creative_id, e)
        creative.ai_generated_url = f"https://placehold.co/1080x1080/purple/white?text=AI+Creative+{creative_id}"
        creative.status = CreativeStatus.generated

    db.commit()
    db.refresh(creative)
    return creative


def upload_replacement(
    db: Session, creative_id: int, url: str, user_id: int
) -> Creative:
    creative = get_creative(db, creative_id)
    creative.designer_uploaded_url = url
    creative.final_url = url
    creative.status = CreativeStatus.designer_replaced
    creative.reviewed_by = user_id
    db.commit()
    db.refresh(creative)
    logger.info("Designer uploaded replacement for creative %d", creative_id)
    return creative


CREATIVE_TRANSITIONS: dict[str, list[str]] = {
    "generated": ["submitted"],
    "designer_replaced": ["submitted"],
    "submitted": ["tl_approved", "rejected"],
    "tl_approved": ["approved", "rejected"],
    "approved": [],
    "rejected": ["generated", "designer_replaced", "submitted"],
}


def update_status(
    db: Session, creative_id: int, new_status: str, user_id: int
) -> Creative:
    creative = get_creative(db, creative_id)
    current = creative.status.value
    valid = CREATIVE_TRANSITIONS.get(current, [])

    if new_status not in valid:
        raise BadRequestError(
            f"Cannot transition creative from '{current}' to '{new_status}'"
        )

    creative.status = CreativeStatus(new_status)

    if new_status == "approved":
        creative.final_url = creative.designer_uploaded_url or creative.ai_generated_url
        # Also update the content request to approved
        if creative.content_request:
            from app.models.content_request import ContentStatus
            creative.content_request.status = ContentStatus.approved
            logger.info("Content request %d approved via creative approval", creative.content_request_id)

    if new_status == "rejected":
        creative.reviewed_by = user_id

    db.commit()
    db.refresh(creative)
    logger.info("Creative %d status: %s -> %s by user %d", creative_id, current, new_status, user_id)
    return creative
