import logging

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User, UserRole
from app.schemas.content_request import (
    ContentRequestCreate,
    ContentRequestListResponse,
    ContentRequestResponse,
    ContentRequestUpdate,
    StatusUpdate,
)
from app.services import content_request_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/content-requests", tags=["content-requests"])


@router.post("/", response_model=ContentRequestResponse, status_code=status.HTTP_201_CREATED)
async def create(
    data: ContentRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ContentRequestResponse:
    content = content_request_service.create_content_request(db, data, current_user.id)
    return ContentRequestResponse.model_validate(content)


@router.get("/", response_model=ContentRequestListResponse)
async def list_requests(
    status_filter: str | None = Query(None, alias="status"),
    platform: str | None = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ContentRequestListResponse:
    # Team leads, managers, and admins can see all content requests
    user_id_filter = current_user.id
    if current_user.role in (UserRole.team_lead, UserRole.manager, UserRole.admin, UserRole.designer):
        user_id_filter = None

    result = content_request_service.list_content_requests(
        db,
        user_id=user_id_filter,
        status=status_filter,
        platform=platform,
        page=page,
        per_page=per_page,
    )
    return ContentRequestListResponse(
        items=[ContentRequestResponse.model_validate(i) for i in result["items"]],
        total=result["total"],
        page=result["page"],
        per_page=result["per_page"],
    )


@router.get("/{content_id}", response_model=ContentRequestResponse)
async def get(
    content_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ContentRequestResponse:
    content = content_request_service.get_content_request(db, content_id)
    return ContentRequestResponse.model_validate(content)


@router.put("/{content_id}", response_model=ContentRequestResponse)
async def update(
    content_id: int,
    data: ContentRequestUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ContentRequestResponse:
    content = content_request_service.update_content_request(
        db, content_id, data, current_user.id
    )
    return ContentRequestResponse.model_validate(content)


@router.delete("/{content_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete(
    content_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    content_request_service.delete_content_request(db, content_id, current_user.id)


@router.post("/{content_id}/generate", response_model=ContentRequestResponse)
async def generate(
    content_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ContentRequestResponse:
    content = content_request_service.generate_content(db, content_id, current_user.id)
    return ContentRequestResponse.model_validate(content)


@router.post("/{content_id}/regenerate", response_model=ContentRequestResponse)
async def regenerate(
    content_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ContentRequestResponse:
    content = content_request_service.generate_content(db, content_id, current_user.id)
    return ContentRequestResponse.model_validate(content)


@router.put("/{content_id}/status", response_model=ContentRequestResponse)
async def change_status(
    content_id: int,
    data: StatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ContentRequestResponse:
    content = content_request_service.update_status(
        db, content_id, data.status, current_user.id
    )
    return ContentRequestResponse.model_validate(content)
