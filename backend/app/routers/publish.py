import logging
from datetime import datetime

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.publish import PublishJobCreate, PublishJobListResponse, PublishJobResponse
from app.services import publish_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/publish", tags=["publishing"])


@router.post("/", response_model=PublishJobResponse, status_code=status.HTTP_201_CREATED)
async def create(
    data: PublishJobCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PublishJobResponse:
    job = publish_service.create_publish_job(
        db, data.content_request_id, data.creative_id,
        data.platform, data.scheduled_at, current_user.id
    )
    return PublishJobResponse.model_validate(job)


@router.get("/", response_model=PublishJobListResponse)
async def list_jobs(
    platform: str | None = None,
    status_filter: str | None = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> PublishJobListResponse:
    result = publish_service.list_publish_jobs(
        db, platform=platform, status=status_filter, page=page, per_page=per_page
    )
    items = []
    for job in result["items"]:
        resp = PublishJobResponse.model_validate(job)
        if job.content_request:
            resp.content_title = job.content_request.title
        items.append(resp)
    return PublishJobListResponse(
        items=items,
        total=result["total"],
        page=result["page"],
        per_page=result["per_page"],
    )


@router.get("/calendar", response_model=list[PublishJobResponse])
async def calendar(
    start_date: datetime = Query(...),
    end_date: datetime = Query(...),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[PublishJobResponse]:
    jobs = publish_service.get_calendar(db, start_date, end_date)
    return [PublishJobResponse.model_validate(j) for j in jobs]


@router.get("/{job_id}", response_model=PublishJobResponse)
async def get(
    job_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> PublishJobResponse:
    job = publish_service.get_publish_job(db, job_id)
    return PublishJobResponse.model_validate(job)


@router.put("/{job_id}/cancel", response_model=PublishJobResponse)
async def cancel(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PublishJobResponse:
    job = publish_service.cancel_publish_job(db, job_id, current_user.id)
    return PublishJobResponse.model_validate(job)


@router.post("/{job_id}/retry", response_model=PublishJobResponse)
async def retry(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PublishJobResponse:
    job = publish_service.retry_publish_job(db, job_id, current_user.id)
    return PublishJobResponse.model_validate(job)


@router.post("/{job_id}/execute", response_model=PublishJobResponse)
async def execute(
    job_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> PublishJobResponse:
    job = await publish_service.execute_publish(db, job_id)
    return PublishJobResponse.model_validate(job)
