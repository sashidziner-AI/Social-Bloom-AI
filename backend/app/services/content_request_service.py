import logging

from sqlalchemy.orm import Session

from app.exceptions import BadRequestError, ForbiddenError, NotFoundError
from app.models.content_request import ContentRequest, ContentStatus, Platform, Tone
from app.schemas.content_request import ContentRequestCreate, ContentRequestUpdate

logger = logging.getLogger(__name__)

VALID_TRANSITIONS: dict[str, list[str]] = {
    "draft": ["pending_review"],
    "pending_review": ["reviewed", "revision_requested"],
    "reviewed": ["designer_review", "revision_requested"],
    "designer_review": ["approved", "revision_requested"],
    "approved": ["published"],
    "revision_requested": ["pending_review"],
    "rejected": ["draft"],
    "published": [],
}


def create_content_request(
    db: Session, data: ContentRequestCreate, user_id: int
) -> ContentRequest:
    Platform(data.platform)
    Tone(data.tone)

    content = ContentRequest(
        title=data.title,
        platform=Platform(data.platform),
        tone=Tone(data.tone),
        target_audience=data.target_audience,
        topic=data.topic,
        keywords=data.keywords,
        created_by=user_id,
    )
    db.add(content)
    db.commit()
    db.refresh(content)
    logger.info("Content request created: %d by user %d", content.id, user_id)
    return content


def get_content_request(
    db: Session, content_id: int, user_id: int | None = None
) -> ContentRequest:
    query = db.query(ContentRequest).filter(ContentRequest.id == content_id)
    content = query.first()
    if not content:
        raise NotFoundError("Content request")
    return content


def list_content_requests(
    db: Session,
    user_id: int | None = None,
    status: str | None = None,
    platform: str | None = None,
    page: int = 1,
    per_page: int = 20,
) -> dict:
    query = db.query(ContentRequest)
    if user_id:
        query = query.filter(ContentRequest.created_by == user_id)
    if status:
        query = query.filter(ContentRequest.status == ContentStatus(status))
    if platform:
        query = query.filter(ContentRequest.platform == Platform(platform))

    total = query.count()
    items = (
        query.order_by(ContentRequest.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )
    return {"items": items, "total": total, "page": page, "per_page": per_page}


def update_content_request(
    db: Session, content_id: int, data: ContentRequestUpdate, user_id: int
) -> ContentRequest:
    content = get_content_request(db, content_id)
    if content.created_by != user_id:
        raise ForbiddenError("Only the owner can edit this content request")
    if content.status not in (ContentStatus.draft, ContentStatus.revision_requested):
        raise BadRequestError("Only draft or revision-requested content requests can be edited")

    for field, value in data.model_dump(exclude_unset=True).items():
        if field == "platform" and value:
            setattr(content, field, Platform(value))
        elif field == "tone" and value:
            setattr(content, field, Tone(value))
        else:
            setattr(content, field, value)

    db.commit()
    db.refresh(content)
    return content


def delete_content_request(db: Session, content_id: int, user_id: int) -> None:
    content = get_content_request(db, content_id)
    if content.created_by != user_id:
        raise ForbiddenError("Only the owner can delete this content request")
    if content.status != ContentStatus.draft:
        raise BadRequestError("Only draft content requests can be deleted")

    db.delete(content)
    db.commit()
    logger.info("Content request deleted: %d by user %d", content_id, user_id)


def update_status(
    db: Session, content_id: int, new_status: str, user_id: int
) -> ContentRequest:
    content = get_content_request(db, content_id)
    current = content.status.value
    valid = VALID_TRANSITIONS.get(current, [])
    if new_status not in valid:
        raise BadRequestError(
            f"Cannot transition from '{current}' to '{new_status}'"
        )

    content.status = ContentStatus(new_status)
    db.commit()
    db.refresh(content)
    logger.info(
        "Content request %d status: %s -> %s", content_id, current, new_status
    )
    return content


def generate_content(db: Session, content_id: int, user_id: int) -> ContentRequest:
    from app.services.ai.gemini_service import generate_content_text

    content = get_content_request(db, content_id)

    # generate_content_text handles all errors internally and always returns varied content
    result = generate_content_text(
        topic=content.topic,
        platform=content.platform.value,
        tone=content.tone.value,
        target_audience=content.target_audience,
        keywords=content.keywords,
    )

    content.generated_caption = result["caption"]
    content.generated_description = result["description"]
    content.generated_hashtags = result["hashtags"]
    logger.info("Content generated for request %d", content_id)

    db.commit()
    db.refresh(content)
    return content
