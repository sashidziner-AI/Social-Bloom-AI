import logging
import os
import uuid

from fastapi import APIRouter, Depends, File, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.exceptions import BadRequestError
from app.models.user import User, UserRole
from app.schemas.company import (
    CompanyCreate,
    CompanyListResponse,
    CompanyResponse,
    CompanyUpdate,
)
# TODO: Temporarily hidden — template imports
# from app.schemas.company_template import TemplateResponse, TemplateUpdate
from app.services import company_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/companies", tags=["companies"])

ALLOWED_IMAGE_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/webp"}
MAX_UPLOAD_BYTES = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024


@router.get("/", response_model=CompanyListResponse)
async def list_companies(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> CompanyListResponse:
    result = company_service.list_companies(db, page=page, per_page=per_page)
    return CompanyListResponse(
        items=[CompanyResponse.model_validate(c) for c in result["items"]],
        total=result["total"],
        page=result["page"],
        per_page=result["per_page"],
    )


@router.get("/{company_id}", response_model=CompanyResponse)
async def get_company(
    company_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> CompanyResponse:
    company = company_service.get_company(db, company_id)
    return CompanyResponse.model_validate(company)


@router.post("/", response_model=CompanyResponse, status_code=status.HTTP_201_CREATED)
async def create_company(
    data: CompanyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
) -> CompanyResponse:
    company = company_service.create_company(db, data, current_user.id)
    return CompanyResponse.model_validate(company)


@router.put("/{company_id}", response_model=CompanyResponse)
async def update_company(
    company_id: int,
    data: CompanyUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin)),
) -> CompanyResponse:
    company = company_service.update_company(db, company_id, data)
    return CompanyResponse.model_validate(company)


@router.post("/{company_id}/logo", response_model=CompanyResponse)
async def upload_logo(
    company_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin)),
) -> CompanyResponse:
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise BadRequestError(
            f"Invalid file type: {file.content_type}. Allowed: PNG, JPEG, WebP"
        )

    contents = await file.read()
    if len(contents) > MAX_UPLOAD_BYTES:
        raise BadRequestError(
            f"File too large. Maximum size: {settings.MAX_UPLOAD_SIZE_MB}MB"
        )

    upload_dir = os.path.join(settings.UPLOAD_DIR, "logos")
    os.makedirs(upload_dir, exist_ok=True)

    ext = (
        file.filename.rsplit(".", 1)[-1].lower()
        if file.filename and "." in file.filename
        else "png"
    )
    filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = os.path.join(upload_dir, filename)

    with open(filepath, "wb") as f:
        f.write(contents)

    url_path = f"/uploads/logos/{filename}"
    logger.info("Logo uploaded for company %d: %s (%d bytes)", company_id, url_path, len(contents))

    company = company_service.update_logo(db, company_id, url_path)
    return CompanyResponse.model_validate(company)


@router.delete("/{company_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_company(
    company_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin)),
) -> None:
    company_service.delete_company(db, company_id)


# TODO: Temporarily hidden — template endpoints
# @router.get("/{company_id}/templates", response_model=list[TemplateResponse])
# async def list_templates(company_id: int, db: Session = Depends(get_db),
#     _: User = Depends(require_role(UserRole.admin))) -> list[TemplateResponse]:
#     templates = company_service.list_templates(db, company_id)
#     return [TemplateResponse.model_validate(t) for t in templates]
#
# @router.get("/templates/{template_id}", response_model=TemplateResponse)
# async def get_template(template_id: int, db: Session = Depends(get_db),
#     _: User = Depends(require_role(UserRole.admin))) -> TemplateResponse:
#     template = company_service.get_template(db, template_id)
#     return TemplateResponse.model_validate(template)
#
# @router.put("/templates/{template_id}", response_model=TemplateResponse)
# async def update_template(template_id: int, data: TemplateUpdate,
#     db: Session = Depends(get_db),
#     _: User = Depends(require_role(UserRole.admin))) -> TemplateResponse:
#     template = company_service.update_template(db, template_id, data)
#     return TemplateResponse.model_validate(template)
