import logging
import os
import uuid

from fastapi import APIRouter, Depends, File, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User, UserRole
from app.schemas.creative import (
    CreativeCreate,
    CreativeListResponse,
    CreativeResponse,
    CreativeStatusUpdate,
    CreativeUpdate,
)
from app.services import creative_service

ALLOWED_IMAGE_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"}
MAX_UPLOAD_BYTES = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/creatives", tags=["creatives"])


@router.post("/", response_model=CreativeResponse, status_code=status.HTTP_201_CREATED)
async def create(
    data: CreativeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CreativeResponse:
    creative = creative_service.create_creative(db, data, current_user.id)
    return CreativeResponse.model_validate(creative)


@router.get("/", response_model=CreativeListResponse)
async def list_creatives(
    content_request_id: int | None = None,
    status_filter: str | None = Query(None, alias="status"),
    creative_type: str | None = None,
    assigned_to: int | None = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CreativeListResponse:
    # Designers see creatives assigned to them on the list page,
    # but can see all creatives when viewing a specific content request
    effective_assigned_to = assigned_to
    if current_user.role == UserRole.designer and assigned_to is None and content_request_id is None:
        effective_assigned_to = current_user.id

    result = creative_service.list_creatives(
        db,
        content_request_id=content_request_id,
        status=status_filter,
        creative_type=creative_type,
        assigned_to=effective_assigned_to,
        page=page,
        per_page=per_page,
    )
    return CreativeListResponse(
        items=[CreativeResponse.model_validate(i) for i in result["items"]],
        total=result["total"],
        page=result["page"],
        per_page=result["per_page"],
    )


@router.get("/{creative_id}", response_model=CreativeResponse)
async def get(
    creative_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> CreativeResponse:
    creative = creative_service.get_creative(db, creative_id)
    return CreativeResponse.model_validate(creative)


@router.put("/{creative_id}", response_model=CreativeResponse)
async def update(
    creative_id: int,
    data: CreativeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CreativeResponse:
    creative = creative_service.update_creative(db, creative_id, data, current_user.id)
    return CreativeResponse.model_validate(creative)


@router.delete("/{creative_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete(
    creative_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    creative_service.delete_creative(db, creative_id, current_user.id)


@router.post("/{creative_id}/generate", response_model=CreativeResponse)
async def generate(
    creative_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CreativeResponse:
    creative = creative_service.generate_creative(db, creative_id, current_user.id)
    return CreativeResponse.model_validate(creative)


@router.post("/{creative_id}/upload", response_model=CreativeResponse)
async def upload(
    creative_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CreativeResponse:
    # Validate file type
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        from app.exceptions import BadRequestError
        raise BadRequestError(f"Invalid file type: {file.content_type}. Allowed: PNG, JPEG, WebP, GIF")

    # Read and validate file size
    contents = await file.read()
    if len(contents) > MAX_UPLOAD_BYTES:
        from app.exceptions import BadRequestError
        raise BadRequestError(f"File too large. Maximum size: {settings.MAX_UPLOAD_SIZE_MB}MB")

    # Save file
    upload_dir = os.path.join(settings.UPLOAD_DIR, "designer")
    os.makedirs(upload_dir, exist_ok=True)

    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else "png"
    filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = os.path.join(upload_dir, filename)

    with open(filepath, "wb") as f:
        f.write(contents)

    url_path = f"/uploads/designer/{filename}"
    logger.info("Designer uploaded file for creative %d: %s (%d bytes)", creative_id, url_path, len(contents))

    creative = creative_service.upload_replacement(
        db, creative_id, url_path, current_user.id
    )
    return CreativeResponse.model_validate(creative)


@router.put("/{creative_id}/status", response_model=CreativeResponse)
async def change_status(
    creative_id: int,
    data: CreativeStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CreativeResponse:
    logger.info("Creative %d status change: status=%s, comments=%s", creative_id, data.status, data.comments)
    creative = creative_service.update_status(
        db, creative_id, data.status, current_user.id, data.comments
    )
    return CreativeResponse.model_validate(creative)
