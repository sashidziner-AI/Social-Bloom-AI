import logging
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.exceptions import BadRequestError, NotFoundError
from app.models.content_request import ContentRequest, ContentStatus, Platform
from app.models.publish_job import PublishJob, PublishStatus
from app.services import audit_service

logger = logging.getLogger(__name__)


def create_publish_job(
    db: Session, content_request_id: int, creative_id: int | None,
    platform: str, scheduled_at: datetime | None, user_id: int
) -> PublishJob:
    content = (
        db.query(ContentRequest)
        .filter(ContentRequest.id == content_request_id)
        .first()
    )
    if not content:
        raise NotFoundError("Content request")
    if content.status != ContentStatus.approved:
        raise BadRequestError("Content must be approved before publishing")

    Platform(platform)

    job = PublishJob(
        content_request_id=content_request_id,
        creative_id=creative_id,
        platform=Platform(platform),
        scheduled_at=scheduled_at,
        status=PublishStatus.scheduled,
        created_by=user_id,
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    audit_service.log_action(
        db, "publish_job", job.id, "created", user_id,
        details={"platform": platform, "content_request_id": content_request_id},
    )
    logger.info("Publish job created: %d for content %d", job.id, content_request_id)
    return job


def get_publish_job(db: Session, job_id: int) -> PublishJob:
    job = db.query(PublishJob).filter(PublishJob.id == job_id).first()
    if not job:
        raise NotFoundError("Publish job")
    return job


def list_publish_jobs(
    db: Session,
    platform: str | None = None,
    status: str | None = None,
    page: int = 1,
    per_page: int = 20,
) -> dict:
    query = db.query(PublishJob)
    if platform:
        query = query.filter(PublishJob.platform == Platform(platform))
    if status:
        query = query.filter(PublishJob.status == PublishStatus(status))

    total = query.count()
    items = (
        query.order_by(PublishJob.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )
    return {"items": items, "total": total, "page": page, "per_page": per_page}


def cancel_publish_job(db: Session, job_id: int, user_id: int) -> PublishJob:
    job = get_publish_job(db, job_id)
    if job.status != PublishStatus.scheduled:
        raise BadRequestError("Only scheduled jobs can be cancelled")

    job.status = PublishStatus.cancelled
    db.commit()
    db.refresh(job)

    audit_service.log_action(db, "publish_job", job.id, "cancelled", user_id)
    return job


def retry_publish_job(db: Session, job_id: int, user_id: int) -> PublishJob:
    job = get_publish_job(db, job_id)
    if job.status != PublishStatus.failed:
        raise BadRequestError("Only failed jobs can be retried")

    job.status = PublishStatus.scheduled
    job.retry_count += 1
    job.error_message = None
    db.commit()
    db.refresh(job)

    audit_service.log_action(
        db, "publish_job", job.id, "retry", user_id,
        details={"retry_count": job.retry_count},
    )
    return job


async def execute_publish(db: Session, job_id: int) -> PublishJob:
    from app.services.platform_adapters import get_adapter

    job = get_publish_job(db, job_id)
    if job.status not in (PublishStatus.scheduled, PublishStatus.failed):
        raise BadRequestError("Only scheduled or failed jobs can be executed")

    job.status = PublishStatus.publishing
    db.commit()

    content = job.content_request
    caption = content.generated_caption or content.title
    description = content.generated_description
    hashtags = content.generated_hashtags or []

    # Get creative image URL if available
    image_url = None
    if job.creative and job.creative.final_url:
        image_url = job.creative.final_url

    try:
        adapter = get_adapter(job.platform.value)
        result = await adapter.publish(
            caption=caption,
            description=description,
            hashtags=hashtags,
            image_url=image_url,
        )

        job.status = PublishStatus.published
        job.published_at = datetime.now(timezone.utc)
        job.platform_post_id = result.post_id
        job.platform_post_url = result.post_url
        job.error_message = None
        db.commit()
        db.refresh(job)

        audit_service.log_action(
            db, "publish_job", job.id, "published", job.created_by,
            details={"platform_post_id": result.post_id},
        )
        logger.info("Published job %d to %s", job.id, job.platform.value)

    except Exception as e:
        job.status = PublishStatus.failed
        job.error_message = str(e)[:500]
        job.retry_count += 1
        db.commit()
        db.refresh(job)

        audit_service.log_action(
            db, "publish_job", job.id, "failed", job.created_by,
            details={"error": str(e)[:200]},
        )
        logger.error("Publish job %d failed: %s", job.id, e)

    return job


def get_calendar(
    db: Session, start_date: datetime, end_date: datetime
) -> list[PublishJob]:
    return (
        db.query(PublishJob)
        .filter(
            PublishJob.scheduled_at >= start_date,
            PublishJob.scheduled_at <= end_date,
        )
        .order_by(PublishJob.scheduled_at.asc())
        .all()
    )
