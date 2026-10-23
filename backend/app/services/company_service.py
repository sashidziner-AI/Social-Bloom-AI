import logging
from typing import Any

from sqlalchemy.orm import Session

from app.exceptions import NotFoundError
from app.models.company import Company
from app.models.company_template import (
    CompanyTemplate,
    LogoPosition,
    PLATFORM_DEFAULTS,
    TemplatePlatform,
)
from app.schemas.company import CompanyCreate, CompanyUpdate
from app.schemas.company_template import TemplateUpdate

logger = logging.getLogger(__name__)


def list_companies(
    db: Session, *, page: int = 1, per_page: int = 20
) -> dict[str, Any]:
    query = db.query(Company).order_by(Company.id.desc())
    total = query.count()
    items = query.offset((page - 1) * per_page).limit(per_page).all()
    return {"items": items, "total": total, "page": page, "per_page": per_page}


def get_company(db: Session, company_id: int) -> Company:
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise NotFoundError("Company")
    return company


def create_company(db: Session, data: CompanyCreate, user_id: int) -> Company:
    company = Company(
        name=data.name,
        primary_color=data.primary_color,
        secondary_color=data.secondary_color,
        font_family=data.font_family,
        created_by=user_id,
    )
    db.add(company)
    db.flush()

    # TODO: Temporarily hidden — default template creation per platform
    # for platform_key, defaults in PLATFORM_DEFAULTS.items():
    #     template = CompanyTemplate(
    #         company_id=company.id,
    #         platform=TemplatePlatform(platform_key),
    #         name=defaults["name"],
    #         width=defaults["width"],
    #         height=defaults["height"],
    #         bg_color=data.primary_color,
    #         text_color="#FFFFFF",
    #         heading_font_size=48,
    #         body_font_size=24,
    #         logo_position=LogoPosition.top_left,
    #         overlay_opacity=0.4,
    #     )
    #     db.add(template)

    db.commit()
    db.refresh(company)
    logger.info("Company created: id=%d name=%s by user=%d", company.id, company.name, user_id)
    return company


def update_company(db: Session, company_id: int, data: CompanyUpdate) -> Company:
    company = get_company(db, company_id)
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(company, key, value)
    db.commit()
    db.refresh(company)
    logger.info("Company updated: id=%d", company_id)
    return company


def update_logo(db: Session, company_id: int, logo_url: str) -> Company:
    company = get_company(db, company_id)
    company.logo_url = logo_url
    db.commit()
    db.refresh(company)
    logger.info("Company logo updated: id=%d url=%s", company_id, logo_url)
    return company


def delete_company(db: Session, company_id: int) -> None:
    company = get_company(db, company_id)
    db.delete(company)
    db.commit()
    logger.info("Company deleted: id=%d", company_id)


# ── Template operations ──────────────────────────────────────────────

def list_templates(db: Session, company_id: int) -> list[CompanyTemplate]:
    get_company(db, company_id)  # ensure company exists
    return (
        db.query(CompanyTemplate)
        .filter(CompanyTemplate.company_id == company_id)
        .order_by(CompanyTemplate.id)
        .all()
    )


def get_template(db: Session, template_id: int) -> CompanyTemplate:
    template = db.query(CompanyTemplate).filter(CompanyTemplate.id == template_id).first()
    if not template:
        raise NotFoundError("Template")
    return template


def update_template(db: Session, template_id: int, data: TemplateUpdate) -> CompanyTemplate:
    template = get_template(db, template_id)
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(template, key, value)
    db.commit()
    db.refresh(template)
    logger.info("Template updated: id=%d", template_id)
    return template
