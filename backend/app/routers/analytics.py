import logging

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models.user import User, UserRole
from app.schemas.analytics import (
    AnalyticsResponse,
    OverviewResponse,
    PlatformAnalyticsResponse,
    TeamProductivityResponse,
)
from app.services import analytics_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/dashboard")
async def dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    return analytics_service.get_dashboard_stats(db, current_user)


@router.get("/overview", response_model=OverviewResponse)
async def overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> OverviewResponse:
    return analytics_service.get_overview(db, user_id=current_user.id)


@router.get("/content/{content_id}", response_model=list[AnalyticsResponse])
async def content_analytics(
    content_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[AnalyticsResponse]:
    items = analytics_service.get_content_analytics(db, content_id)
    return [AnalyticsResponse.model_validate(i) for i in items]


@router.get("/platform/{platform}", response_model=PlatformAnalyticsResponse)
async def platform_analytics(
    platform: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> PlatformAnalyticsResponse:
    return analytics_service.get_platform_analytics(db, platform)


@router.get("/team", response_model=list[TeamProductivityResponse])
async def team_productivity(
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin, UserRole.manager)),
) -> list[TeamProductivityResponse]:
    return analytics_service.get_team_productivity(db)
