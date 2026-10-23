"""Seed script to populate demo data for all tables."""
import logging
import sys
import os
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(__file__))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from app.database import SessionLocal
from app.models.user import User, UserRole
from app.models.content_request import ContentRequest, Platform, Tone, ContentStatus
from app.models.creative import Creative, CreativeType, CreativeStatus
from app.models.approval import Approval, ApprovalHistory, EntityType, ApprovalLevel, ApprovalStatus, ApprovalAction
from app.models.publish_job import PublishJob, PublishStatus
from app.models.analytics import Analytics
from app.models.audit_log import AuditLog
from app.models.user_permission import UserPermission  # noqa: F401
from app.models.role_permission_override import RolePermissionOverride  # noqa: F401
from app.models.refresh_token import RefreshToken  # noqa: F401


def seed():
    db = SessionLocal()
    try:
        # Get user IDs
        admin = db.query(User).filter(User.role == UserRole.admin).first()
        manager = db.query(User).filter(User.role == UserRole.manager).first()
        team_lead = db.query(User).filter(User.role == UserRole.team_lead).first()
        creator = db.query(User).filter(User.role == UserRole.creator).first()
        designer = db.query(User).filter(User.role == UserRole.designer).first()

        if not all([admin, manager, team_lead, creator, designer]):
            logger.error("Run seed_users.py first!")
            return

        # Check if demo data already exists
        if db.query(ContentRequest).count() > 0:
            logger.info("Demo data already exists, skipping.")
            return

        now = datetime.now(timezone.utc)

        # --- Content Requests ---
        content_requests = [
            ContentRequest(
                title="Spring Product Launch Announcement",
                platform=Platform.facebook,
                tone=Tone.professional,
                target_audience="Small business owners aged 25-45",
                topic="Announcing our new AI-powered social media scheduling tool",
                keywords=["product launch", "AI", "social media", "automation"],
                generated_caption="Revolutionize your social media strategy with our AI-powered scheduling tool. Automate, optimize, and grow your online presence effortlessly.",
                generated_description="We're thrilled to announce the launch of Social Bloom AI — your all-in-one platform for creating, scheduling, and publishing social media content powered by artificial intelligence.",
                generated_hashtags=["#SocialBloomAI", "#ProductLaunch", "#SocialMedia", "#AITools"],
                status=ContentStatus.published,
                created_by=creator.id,
                assigned_to=designer.id,
            ),
            ContentRequest(
                title="Weekly Tips: Content Marketing",
                platform=Platform.linkedin,
                tone=Tone.educational,
                target_audience="Marketing professionals",
                topic="5 content marketing tips to boost engagement in 2026",
                keywords=["content marketing", "engagement", "tips", "strategy"],
                generated_caption="5 Content Marketing Tips That Will Transform Your Engagement in 2026. Are you ready to level up your strategy?",
                generated_description="Content marketing continues to evolve. Here are 5 proven strategies that top marketers are using to drive engagement and build lasting relationships with their audience.",
                generated_hashtags=["#ContentMarketing", "#MarketingTips", "#DigitalMarketing"],
                status=ContentStatus.approved,
                created_by=creator.id,
                assigned_to=designer.id,
            ),
            ContentRequest(
                title="Behind the Scenes - Team Culture",
                platform=Platform.instagram,
                tone=Tone.casual,
                target_audience="Gen Z and millennials interested in tech startups",
                topic="A day in the life at Social Bloom AI headquarters",
                keywords=["team culture", "startup life", "behind the scenes"],
                generated_caption="Ever wonder what a day at a tech startup looks like? Here's a sneak peek into our creative process at Social Bloom AI!",
                generated_description="From morning standups to brainstorming sessions, our team brings energy and creativity to everything we do.",
                generated_hashtags=["#StartupLife", "#TechCulture", "#BehindTheScenes", "#TeamWork"],
                status=ContentStatus.pending_review,
                created_by=creator.id,
                assigned_to=designer.id,
            ),
            ContentRequest(
                title="Customer Success Story - TechCorp",
                platform=Platform.linkedin,
                tone=Tone.professional,
                target_audience="Enterprise decision makers",
                topic="How TechCorp increased social media engagement by 300% using our platform",
                keywords=["case study", "customer success", "ROI", "enterprise"],
                generated_caption="TechCorp saw a 300% increase in social media engagement after switching to Social Bloom AI. Read their success story.",
                generated_description="When TechCorp was struggling with inconsistent social media presence across 5 platforms, they turned to Social Bloom AI. Within 3 months, they saw dramatic improvements.",
                generated_hashtags=["#CaseStudy", "#CustomerSuccess", "#SocialMediaROI"],
                status=ContentStatus.reviewed,
                created_by=creator.id,
            ),
            ContentRequest(
                title="Holiday Promotion Campaign",
                platform=Platform.facebook,
                tone=Tone.humorous,
                target_audience="Existing customers and prospects",
                topic="Special holiday discount on annual subscriptions",
                keywords=["holiday", "promotion", "discount", "subscription"],
                generated_caption="This holiday season, give your social media the gift of AI! Get 40% off annual plans. Because your followers deserve better than last-minute posts.",
                generated_description="Celebrate the holidays with Social Bloom AI! For a limited time, enjoy 40% off all annual subscription plans.",
                generated_hashtags=["#HolidayDeal", "#SocialBloomAI", "#SpecialOffer"],
                status=ContentStatus.draft,
                created_by=creator.id,
            ),
            ContentRequest(
                title="AI Trends 2026 Infographic",
                platform=Platform.twitter,
                tone=Tone.educational,
                target_audience="Tech enthusiasts and marketers",
                topic="Top AI trends shaping social media marketing in 2026",
                keywords=["AI trends", "2026", "social media", "infographic"],
                generated_caption="The future of social media marketing is here. Check out the top AI trends driving change in 2026.",
                generated_description="From generative AI content to predictive analytics, these trends are reshaping how brands connect with their audience.",
                generated_hashtags=["#AITrends", "#FutureOfMarketing", "#AI2026"],
                status=ContentStatus.draft,
                created_by=creator.id,
            ),
            ContentRequest(
                title="Platform Update Announcement",
                platform=Platform.twitter,
                tone=Tone.professional,
                target_audience="Current users and developers",
                topic="New features released: bulk scheduling and analytics dashboard",
                keywords=["update", "new features", "scheduling", "analytics"],
                generated_caption="Big update! Bulk scheduling and a brand-new analytics dashboard are now live on Social Bloom AI.",
                generated_description="We've been listening to your feedback. Today we're rolling out two highly requested features.",
                generated_hashtags=["#ProductUpdate", "#NewFeatures", "#SocialBloomAI"],
                status=ContentStatus.revision_requested,
                created_by=creator.id,
            ),
            ContentRequest(
                title="Instagram Reels Strategy Guide",
                platform=Platform.instagram,
                tone=Tone.inspirational,
                target_audience="Content creators and influencers",
                topic="How to create viral Instagram Reels using AI tools",
                keywords=["Instagram Reels", "viral content", "AI tools", "creator tips"],
                generated_caption="Dream it. Create it. Go viral. Here's how AI is helping creators make Instagram Reels that actually get seen.",
                generated_description="Stop guessing what works. Use AI-powered insights to craft Reels that resonate with your audience and boost your reach.",
                generated_hashtags=["#InstagramReels", "#ContentCreator", "#ViralContent", "#AICreator"],
                status=ContentStatus.confirmed,
                created_by=creator.id,
                assigned_to=designer.id,
            ),
        ]

        for cr in content_requests:
            db.add(cr)
        db.flush()
        logger.info("Created %d content requests", len(content_requests))

        # --- Creatives ---
        creatives = [
            Creative(
                content_request_id=content_requests[0].id,
                creative_type=CreativeType.image,
                prompt="Modern product launch graphic with AI theme, blue gradient background, sleek typography",
                ai_generated_url="/uploads/demo/spring-launch.png",
                final_url="/uploads/demo/spring-launch-final.png",
                status=CreativeStatus.approved,
                notes="Approved by manager. Final version with brand colors.",
                created_by=creator.id,
                reviewed_by=designer.id,
                assigned_to=designer.id,
            ),
            Creative(
                content_request_id=content_requests[1].id,
                creative_type=CreativeType.carousel,
                prompt="Professional carousel with 5 slides for content marketing tips, clean design",
                ai_generated_url="/uploads/demo/marketing-tips.png",
                designer_uploaded_url="/uploads/demo/marketing-tips-v2.png",
                final_url="/uploads/demo/marketing-tips-v2.png",
                status=CreativeStatus.tl_approved,
                notes="Designer enhanced the AI version with better typography.",
                created_by=creator.id,
                reviewed_by=designer.id,
                assigned_to=designer.id,
            ),
            Creative(
                content_request_id=content_requests[2].id,
                creative_type=CreativeType.image,
                prompt="Candid office photo style, bright and energetic, team working together",
                ai_generated_url="/uploads/demo/team-culture.png",
                status=CreativeStatus.designer_review,
                notes="Waiting for designer to review and enhance.",
                created_by=creator.id,
                assigned_to=designer.id,
            ),
            Creative(
                content_request_id=content_requests[3].id,
                creative_type=CreativeType.image,
                prompt="Professional case study graphic with charts showing 300% growth",
                status=CreativeStatus.pending,
                created_by=creator.id,
                assigned_to=designer.id,
            ),
            Creative(
                content_request_id=content_requests[0].id,
                creative_type=CreativeType.video,
                prompt="Short promotional video for product launch, 15 seconds",
                ai_generated_url="/uploads/demo/launch-video.mp4",
                status=CreativeStatus.generated,
                notes="AI generated version ready for designer review.",
                created_by=creator.id,
                assigned_to=designer.id,
            ),
            Creative(
                content_request_id=content_requests[7].id,
                creative_type=CreativeType.video,
                prompt="Dynamic Reels-style vertical video with trending transitions and AI overlay effects",
                ai_generated_url="/uploads/demo/reels-guide.mp4",
                status=CreativeStatus.submitted,
                notes="Submitted for team lead review.",
                created_by=creator.id,
                reviewed_by=designer.id,
                assigned_to=designer.id,
            ),
        ]

        for c in creatives:
            db.add(c)
        db.flush()
        logger.info("Created %d creatives", len(creatives))

        # --- Approvals ---
        approvals_data = [
            # Published content - both levels approved
            Approval(
                entity_type=EntityType.content_request,
                entity_id=content_requests[0].id,
                approval_level=ApprovalLevel.team_lead,
                status=ApprovalStatus.approved,
                reviewer_id=team_lead.id,
                comments="Great content, approved!",
                decided_at=now - timedelta(days=5),
            ),
            Approval(
                entity_type=EntityType.content_request,
                entity_id=content_requests[0].id,
                approval_level=ApprovalLevel.manager,
                status=ApprovalStatus.approved,
                reviewer_id=manager.id,
                comments="Looks good. Ready to publish.",
                decided_at=now - timedelta(days=4),
            ),
            # Approved content - both levels approved
            Approval(
                entity_type=EntityType.content_request,
                entity_id=content_requests[1].id,
                approval_level=ApprovalLevel.team_lead,
                status=ApprovalStatus.approved,
                reviewer_id=team_lead.id,
                comments="Nice tips, well written.",
                decided_at=now - timedelta(days=2),
            ),
            Approval(
                entity_type=EntityType.content_request,
                entity_id=content_requests[1].id,
                approval_level=ApprovalLevel.manager,
                status=ApprovalStatus.approved,
                reviewer_id=manager.id,
                comments="Approved for publishing.",
                decided_at=now - timedelta(days=1),
            ),
            # Pending review - waiting for team lead
            Approval(
                entity_type=EntityType.content_request,
                entity_id=content_requests[2].id,
                approval_level=ApprovalLevel.team_lead,
                status=ApprovalStatus.pending,
                reviewer_id=team_lead.id,
            ),
            # Reviewed - team lead approved, waiting for manager
            Approval(
                entity_type=EntityType.content_request,
                entity_id=content_requests[3].id,
                approval_level=ApprovalLevel.team_lead,
                status=ApprovalStatus.approved,
                reviewer_id=team_lead.id,
                comments="Strong case study. Forwarding to manager.",
                decided_at=now - timedelta(hours=12),
            ),
            Approval(
                entity_type=EntityType.content_request,
                entity_id=content_requests[3].id,
                approval_level=ApprovalLevel.manager,
                status=ApprovalStatus.pending,
                reviewer_id=manager.id,
            ),
            # Revision requested
            Approval(
                entity_type=EntityType.content_request,
                entity_id=content_requests[6].id,
                approval_level=ApprovalLevel.team_lead,
                status=ApprovalStatus.revision_requested,
                reviewer_id=team_lead.id,
                comments="Please add more details about the analytics dashboard features.",
                decided_at=now - timedelta(hours=6),
            ),
            # Creative approvals
            Approval(
                entity_type=EntityType.creative,
                entity_id=creatives[0].id,
                approval_level=ApprovalLevel.team_lead,
                status=ApprovalStatus.approved,
                reviewer_id=team_lead.id,
                comments="Creative looks professional.",
                decided_at=now - timedelta(days=5),
            ),
            Approval(
                entity_type=EntityType.creative,
                entity_id=creatives[0].id,
                approval_level=ApprovalLevel.manager,
                status=ApprovalStatus.approved,
                reviewer_id=manager.id,
                comments="Final approval granted.",
                decided_at=now - timedelta(days=4),
            ),
        ]

        for a in approvals_data:
            db.add(a)
        db.flush()
        logger.info("Created %d approvals", len(approvals_data))

        # --- Approval History ---
        history_entries = [
            ApprovalHistory(
                approval_id=approvals_data[0].id,
                action=ApprovalAction.submitted,
                actor_id=creator.id,
                comments="Submitting for review.",
                created_at=now - timedelta(days=6),
            ),
            ApprovalHistory(
                approval_id=approvals_data[0].id,
                action=ApprovalAction.approved,
                actor_id=team_lead.id,
                comments="Great content, approved!",
                created_at=now - timedelta(days=5),
            ),
            ApprovalHistory(
                approval_id=approvals_data[1].id,
                action=ApprovalAction.approved,
                actor_id=manager.id,
                comments="Looks good. Ready to publish.",
                created_at=now - timedelta(days=4),
            ),
            ApprovalHistory(
                approval_id=approvals_data[7].id,
                action=ApprovalAction.submitted,
                actor_id=creator.id,
                comments="Please review the platform update post.",
                created_at=now - timedelta(hours=8),
            ),
            ApprovalHistory(
                approval_id=approvals_data[7].id,
                action=ApprovalAction.revision_requested,
                actor_id=team_lead.id,
                comments="Please add more details about the analytics dashboard features.",
                created_at=now - timedelta(hours=6),
            ),
        ]

        for h in history_entries:
            db.add(h)
        db.flush()
        logger.info("Created %d approval history entries", len(history_entries))

        # --- Publish Jobs ---
        publish_jobs = [
            PublishJob(
                content_request_id=content_requests[0].id,
                creative_id=creatives[0].id,
                platform=Platform.facebook,
                scheduled_at=now - timedelta(days=3),
                published_at=now - timedelta(days=3),
                status=PublishStatus.published,
                platform_post_id="fb_123456789",
                platform_post_url="https://facebook.com/socialbloom/posts/123456789",
                retry_count=0,
                created_by=manager.id,
            ),
            PublishJob(
                content_request_id=content_requests[1].id,
                creative_id=creatives[1].id,
                platform=Platform.linkedin,
                scheduled_at=now + timedelta(days=1),
                status=PublishStatus.scheduled,
                retry_count=0,
                created_by=manager.id,
            ),
            PublishJob(
                content_request_id=content_requests[7].id,
                creative_id=creatives[5].id,
                platform=Platform.instagram,
                scheduled_at=now + timedelta(days=3),
                status=PublishStatus.scheduled,
                retry_count=0,
                created_by=manager.id,
            ),
            PublishJob(
                content_request_id=content_requests[0].id,
                creative_id=creatives[0].id,
                platform=Platform.linkedin,
                scheduled_at=now - timedelta(days=1),
                status=PublishStatus.failed,
                error_message="LinkedIn API rate limit exceeded. Please retry.",
                retry_count=2,
                created_by=manager.id,
            ),
        ]

        for pj in publish_jobs:
            db.add(pj)
        db.flush()
        logger.info("Created %d publish jobs", len(publish_jobs))

        # --- Analytics ---
        analytics_data = [
            Analytics(
                content_request_id=content_requests[0].id,
                platform=Platform.facebook,
                impressions=12500,
                clicks=890,
                likes=456,
                shares=123,
                comments_count=67,
                engagement_rate=8.54,
                fetched_at=now - timedelta(hours=2),
            ),
            Analytics(
                content_request_id=content_requests[0].id,
                platform=Platform.facebook,
                impressions=8200,
                clicks=620,
                likes=310,
                shares=85,
                comments_count=42,
                engagement_rate=7.12,
                fetched_at=now - timedelta(days=1),
            ),
            Analytics(
                content_request_id=content_requests[1].id,
                platform=Platform.linkedin,
                impressions=5400,
                clicks=340,
                likes=210,
                shares=78,
                comments_count=35,
                engagement_rate=6.23,
                fetched_at=now - timedelta(hours=4),
            ),
            Analytics(
                content_request_id=content_requests[7].id,
                platform=Platform.instagram,
                impressions=18000,
                clicks=1200,
                likes=2100,
                shares=450,
                comments_count=189,
                engagement_rate=12.8,
                fetched_at=now - timedelta(hours=1),
            ),
        ]

        for a in analytics_data:
            db.add(a)
        db.flush()
        logger.info("Created %d analytics records", len(analytics_data))

        # --- Audit Logs ---
        audit_logs = [
            AuditLog(
                entity_type="content_request",
                entity_id=content_requests[0].id,
                action="created",
                actor_id=creator.id,
                details={"title": "Spring Product Launch Announcement"},
                created_at=now - timedelta(days=7),
            ),
            AuditLog(
                entity_type="content_request",
                entity_id=content_requests[0].id,
                action="status_changed",
                actor_id=team_lead.id,
                details={"from": "pending_review", "to": "reviewed"},
                created_at=now - timedelta(days=5),
            ),
            AuditLog(
                entity_type="content_request",
                entity_id=content_requests[0].id,
                action="published",
                actor_id=manager.id,
                details={"platform": "facebook", "post_id": "fb_123456789"},
                created_at=now - timedelta(days=3),
            ),
            AuditLog(
                entity_type="creative",
                entity_id=creatives[0].id,
                action="approved",
                actor_id=manager.id,
                details={"creative_type": "image"},
                created_at=now - timedelta(days=4),
            ),
            AuditLog(
                entity_type="user",
                entity_id=creator.id,
                action="login",
                actor_id=creator.id,
                details={"method": "email"},
                created_at=now - timedelta(hours=1),
            ),
        ]

        for al in audit_logs:
            db.add(al)

        db.commit()
        logger.info("Seed complete! Demo data created successfully.")

    except Exception as e:
        db.rollback()
        logger.error("Seed failed: %s", e)
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
