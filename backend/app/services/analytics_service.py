import logging

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.models.analytics import Analytics
from app.models.approval import Approval, ApprovalHistory, ApprovalLevel, ApprovalStatus, EntityType as ApprovalEntityType
from app.models.content_request import ContentRequest, ContentStatus, Platform
from app.models.creative import Creative, CreativeStatus
from app.models.publish_job import PublishJob, PublishStatus
from app.models.user import User, UserRole
from app.schemas.analytics import (
    OverviewResponse,
    PlatformAnalyticsResponse,
    TeamProductivityResponse,
)

logger = logging.getLogger(__name__)


def get_dashboard_stats(db: Session, user: User) -> dict:
    """Return role-specific dashboard stats for the current user."""
    role = user.role

    stats: dict = {}

    if role == UserRole.creator:
        # Requester sees their own content stats
        my_content = db.query(ContentRequest).filter(ContentRequest.created_by == user.id)
        stats["my_requests"] = my_content.count()
        stats["drafts"] = my_content.filter(ContentRequest.status == ContentStatus.draft).count()
        stats["pending_review"] = my_content.filter(ContentRequest.status == ContentStatus.pending_review).count()
        stats["approved"] = my_content.filter(ContentRequest.status == ContentStatus.approved).count()
        stats["published"] = my_content.filter(ContentRequest.status == ContentStatus.published).count()
        stats["revision_requested"] = my_content.filter(ContentRequest.status == ContentStatus.revision_requested).count()

    elif role == UserRole.designer:
        # Designer sees assigned creatives
        my_creatives = db.query(Creative).filter(Creative.assigned_to == user.id)
        stats["assigned_creatives"] = my_creatives.count()
        stats["pending_upload"] = my_creatives.filter(Creative.status.in_([CreativeStatus.generated, CreativeStatus.rejected])).count()
        stats["submitted"] = my_creatives.filter(Creative.status == CreativeStatus.submitted).count()
        stats["approved"] = my_creatives.filter(Creative.status == CreativeStatus.approved).count()

    elif role == UserRole.team_lead:
        # TL sees content pending their review + creatives pending their approval
        stats["content_pending_review"] = (
            db.query(Approval)
            .filter(Approval.approval_level == ApprovalLevel.team_lead, Approval.status == ApprovalStatus.pending)
            .count()
        )
        stats["creatives_pending_review"] = (
            db.query(Creative).filter(Creative.status == CreativeStatus.submitted).count()
        )
        stats["total_content"] = db.query(ContentRequest).count()
        stats["published"] = db.query(ContentRequest).filter(ContentRequest.status == ContentStatus.published).count()
        stats["ready_to_publish"] = db.query(ContentRequest).filter(ContentRequest.status == ContentStatus.approved).count()

    elif role == UserRole.manager:
        # Manager sees content pending their review + creative approvals
        stats["content_pending_review"] = (
            db.query(Approval)
            .filter(Approval.approval_level == ApprovalLevel.manager, Approval.status == ApprovalStatus.pending)
            .count()
        )
        stats["creatives_pending_review"] = (
            db.query(Creative).filter(Creative.status == CreativeStatus.tl_approved).count()
        )
        stats["total_content"] = db.query(ContentRequest).count()
        stats["approved"] = db.query(ContentRequest).filter(ContentRequest.status == ContentStatus.approved).count()
        stats["published"] = db.query(ContentRequest).filter(ContentRequest.status == ContentStatus.published).count()

    elif role == UserRole.admin:
        # Admin sees everything
        stats["total_users"] = db.query(User).filter(User.is_active.is_(True)).count()
        stats["total_content"] = db.query(ContentRequest).count()
        stats["total_creatives"] = db.query(Creative).count()
        stats["pending_approvals"] = db.query(Approval).filter(Approval.status == ApprovalStatus.pending).count()
        stats["published"] = db.query(ContentRequest).filter(ContentRequest.status == ContentStatus.published).count()

    # Recent activity: last 10 content requests visible to this user
    # Use coalesce(updated_at, created_at) so new items always appear
    last_changed = func.coalesce(ContentRequest.updated_at, ContentRequest.created_at)

    recent_query = db.query(ContentRequest).order_by(last_changed.desc())
    if role == UserRole.creator:
        recent_query = recent_query.filter(ContentRequest.created_by == user.id)
    elif role == UserRole.designer:
        # Designers see content that has creatives assigned to them
        designer_content_ids = (
            db.query(Creative.content_request_id)
            .filter(Creative.assigned_to == user.id)
            .distinct()
        )
        recent_query = recent_query.filter(ContentRequest.id.in_(designer_content_ids))
    recent = recent_query.limit(10).all()

    # Also fetch the latest approval history entry per content request for richer context
    recent_ids = [cr.id for cr in recent]
    # Get latest approval history per content request
    latest_actions: dict[int, dict] = {}
    if recent_ids:
        approvals = (
            db.query(Approval)
            .filter(
                Approval.entity_type == ApprovalEntityType.content_request,
                Approval.entity_id.in_(recent_ids),
            )
            .all()
        )
        approval_ids = [a.id for a in approvals]
        approval_to_entity = {a.id: a.entity_id for a in approvals}

        if approval_ids:
            history_entries = (
                db.query(ApprovalHistory)
                .options(joinedload(ApprovalHistory.actor))
                .filter(ApprovalHistory.approval_id.in_(approval_ids))
                .order_by(ApprovalHistory.created_at.desc())
                .all()
            )
            for h in history_entries:
                entity_id = approval_to_entity.get(h.approval_id)
                if entity_id and entity_id not in latest_actions:
                    latest_actions[entity_id] = {
                        "action": h.action.value,
                        "actor_name": h.actor.full_name if h.actor else None,
                        "actor_role": h.actor.role.value if h.actor and h.actor.role else None,
                        "action_at": h.created_at.isoformat() if h.created_at else None,
                    }

    stats["recent_activity"] = []
    for cr in recent:
        entry: dict = {
            "id": cr.id,
            "title": cr.title,
            "status": cr.status.value,
            "platform": cr.platform.value,
            "updated_at": (cr.updated_at or cr.created_at).isoformat() if (cr.updated_at or cr.created_at) else None,
            "created_at": cr.created_at.isoformat() if cr.created_at else None,
        }
        action_info = latest_actions.get(cr.id)
        if action_info:
            entry["last_action"] = action_info["action"]
            entry["last_action_by"] = action_info["actor_name"]
            entry["last_action_role"] = action_info["actor_role"]
            entry["last_action_at"] = action_info["action_at"]
        stats["recent_activity"].append(entry)

    return stats


def get_overview(db: Session, user_id: int | None = None) -> OverviewResponse:
    query = db.query(
        func.coalesce(func.sum(Analytics.impressions), 0).label("total_impressions"),
        func.coalesce(func.sum(Analytics.clicks), 0).label("total_clicks"),
        func.coalesce(func.sum(Analytics.likes), 0).label("total_likes"),
        func.coalesce(func.sum(Analytics.shares), 0).label("total_shares"),
        func.coalesce(func.avg(Analytics.engagement_rate), 0.0).label("avg_engagement_rate"),
    )

    if user_id:
        query = query.join(
            ContentRequest, Analytics.content_request_id == ContentRequest.id
        ).filter(ContentRequest.created_by == user_id)

    result = query.first()
    return OverviewResponse(
        total_impressions=int(result.total_impressions),
        total_clicks=int(result.total_clicks),
        total_likes=int(result.total_likes),
        total_shares=int(result.total_shares),
        avg_engagement_rate=float(result.avg_engagement_rate),
    )


def get_content_analytics(db: Session, content_request_id: int) -> list[Analytics]:
    return (
        db.query(Analytics)
        .filter(Analytics.content_request_id == content_request_id)
        .order_by(Analytics.fetched_at.desc())
        .all()
    )


def get_platform_analytics(db: Session, platform: str) -> PlatformAnalyticsResponse:
    Platform(platform)

    total_posts = (
        db.query(PublishJob)
        .filter(
            PublishJob.platform == Platform(platform),
            PublishJob.status == PublishStatus.published,
        )
        .count()
    )

    stats = (
        db.query(
            func.coalesce(func.sum(Analytics.impressions), 0).label("total_impressions"),
            func.coalesce(
                func.sum(Analytics.likes) + func.sum(Analytics.shares) + func.sum(Analytics.clicks),
                0,
            ).label("total_engagement"),
        )
        .filter(Analytics.platform == Platform(platform))
        .first()
    )

    return PlatformAnalyticsResponse(
        platform=platform,
        total_posts=total_posts,
        total_impressions=int(stats.total_impressions),
        total_engagement=int(stats.total_engagement),
    )


def get_team_productivity(db: Session) -> list[TeamProductivityResponse]:
    users = db.query(User).filter(User.is_active == True).all()  # noqa: E712
    results = []
    for user in users:
        content_created = (
            db.query(ContentRequest)
            .filter(ContentRequest.created_by == user.id)
            .count()
        )
        content_approved = (
            db.query(ContentRequest)
            .filter(
                ContentRequest.created_by == user.id,
                ContentRequest.status == ContentStatus.approved,
            )
            .count()
        )
        content_published = (
            db.query(ContentRequest)
            .filter(
                ContentRequest.created_by == user.id,
                ContentRequest.status == ContentStatus.published,
            )
            .count()
        )
        results.append(
            TeamProductivityResponse(
                user_id=user.id,
                full_name=user.full_name,
                content_created=content_created,
                content_approved=content_approved,
                content_published=content_published,
            )
        )
    return results
