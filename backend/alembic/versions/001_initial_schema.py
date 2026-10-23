"""Initial schema - all tables.

Revision ID: 001_initial
Revises:
Create Date: 2026-03-30

"""
from alembic import op
import sqlalchemy as sa

revision = "001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Users
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True, index=True),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(100), nullable=True),
        sa.Column(
            "role",
            sa.Enum("admin", "manager", "team_lead", "creator", "designer", name="userrole"),
            nullable=False,
            server_default="creator",
        ),
        sa.Column("avatar_url", sa.String(500), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("is_verified", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )

    # Refresh tokens
    op.create_table(
        "refresh_tokens",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("token", sa.String(500), nullable=False, unique=True, index=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # User permissions
    op.create_table(
        "user_permissions",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("permission_key", sa.String(100), nullable=False),
        sa.Column("granted", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("user_id", "permission_key", name="uq_user_permission"),
    )

    # Role permission overrides
    op.create_table(
        "role_permission_overrides",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "role",
            sa.Enum("admin", "manager", "team_lead", "creator", "designer", name="userrole", create_type=False),
            nullable=False,
            index=True,
        ),
        sa.Column("permission_key", sa.String(100), nullable=False),
        sa.Column("granted", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("role", "permission_key", name="uq_role_permission_override"),
    )

    # Content requests
    op.create_table(
        "content_requests",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column(
            "platform",
            sa.Enum("facebook", "linkedin", "instagram", "twitter", name="platform"),
            nullable=False,
        ),
        sa.Column(
            "tone",
            sa.Enum("professional", "casual", "humorous", "inspirational", "educational", name="tone"),
            nullable=False,
        ),
        sa.Column("target_audience", sa.String(200), nullable=True),
        sa.Column("topic", sa.Text(), nullable=False),
        sa.Column("keywords", sa.JSON(), nullable=True),
        sa.Column("generated_caption", sa.Text(), nullable=True),
        sa.Column("generated_description", sa.Text(), nullable=True),
        sa.Column("generated_hashtags", sa.JSON(), nullable=True),
        sa.Column(
            "status",
            sa.Enum(
                "draft", "pending_review", "reviewed", "approved", "designer_review",
                "rejected", "revision_requested", "confirmed", "published",
                name="contentstatus",
            ),
            nullable=False,
            server_default="draft",
        ),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("assigned_to", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_content_requests_status_platform", "content_requests", ["status", "platform"])

    # Creatives
    op.create_table(
        "creatives",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("content_request_id", sa.Integer(), sa.ForeignKey("content_requests.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column(
            "creative_type",
            sa.Enum("image", "video", "carousel", name="creativetype"),
            nullable=False,
        ),
        sa.Column("prompt", sa.Text(), nullable=True),
        sa.Column("ai_generated_url", sa.String(500), nullable=True),
        sa.Column("designer_uploaded_url", sa.String(500), nullable=True),
        sa.Column("final_url", sa.String(500), nullable=True),
        sa.Column(
            "status",
            sa.Enum(
                "pending", "generating", "generated", "designer_review",
                "designer_replaced", "submitted", "tl_approved", "approved", "rejected",
                name="creativestatus",
            ),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("reviewed_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("assigned_to", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )

    # Creative assets
    op.create_table(
        "creative_assets",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("creative_id", sa.Integer(), sa.ForeignKey("creatives.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("asset_url", sa.String(500), nullable=False),
        sa.Column(
            "asset_type",
            sa.Enum("image", "video", name="assettype"),
            nullable=False,
        ),
        sa.Column("order_index", sa.Integer(), server_default=sa.text("0")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Approvals
    op.create_table(
        "approvals",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "entity_type",
            sa.Enum("content_request", "creative", name="entitytype"),
            nullable=False,
        ),
        sa.Column("entity_id", sa.Integer(), nullable=False, index=True),
        sa.Column(
            "approval_level",
            sa.Enum("team_lead", "manager", name="approvallevel"),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.Enum("pending", "approved", "rejected", "revision_requested", name="approvalstatus"),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("reviewer_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True),
        sa.Column("comments", sa.Text(), nullable=True),
        sa.Column("decided_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_approvals_entity", "approvals", ["entity_type", "entity_id"])
    op.create_index("ix_approvals_status_level", "approvals", ["status", "approval_level"])

    # Approval history
    op.create_table(
        "approval_history",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("approval_id", sa.Integer(), sa.ForeignKey("approvals.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column(
            "action",
            sa.Enum("submitted", "approved", "rejected", "revision_requested", name="approvalaction"),
            nullable=False,
        ),
        sa.Column("actor_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=False),
        sa.Column("comments", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Publish jobs
    op.create_table(
        "publish_jobs",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("content_request_id", sa.Integer(), sa.ForeignKey("content_requests.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("creative_id", sa.Integer(), sa.ForeignKey("creatives.id", ondelete="SET NULL"), nullable=True, index=True),
        sa.Column(
            "platform",
            sa.Enum("facebook", "linkedin", "instagram", "twitter", name="platform", create_type=False),
            nullable=False,
        ),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "status",
            sa.Enum("scheduled", "publishing", "published", "failed", "cancelled", name="publishstatus"),
            nullable=False,
            server_default="scheduled",
        ),
        sa.Column("platform_post_id", sa.String(255), nullable=True),
        sa.Column("platform_post_url", sa.String(500), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("retry_count", sa.Integer(), server_default=sa.text("0")),
        sa.Column(
            "publish_target",
            sa.Enum("profile", "company_page", "both", name="publishtarget"),
            nullable=False,
            server_default="profile",
        ),
        sa.Column("target_org_ids", sa.JSON(), nullable=True),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )

    # LinkedIn organizations
    op.create_table(
        "linkedin_organizations",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("org_id", sa.String(50), nullable=False, unique=True, index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("logo_url", sa.String(500), nullable=True),
        sa.Column("vanity_name", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )

    # Analytics
    op.create_table(
        "analytics",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("content_request_id", sa.Integer(), sa.ForeignKey("content_requests.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column(
            "platform",
            sa.Enum("facebook", "linkedin", "instagram", "twitter", name="platform", create_type=False),
            nullable=False,
        ),
        sa.Column("impressions", sa.Integer(), server_default=sa.text("0")),
        sa.Column("clicks", sa.Integer(), server_default=sa.text("0")),
        sa.Column("likes", sa.Integer(), server_default=sa.text("0")),
        sa.Column("shares", sa.Integer(), server_default=sa.text("0")),
        sa.Column("comments_count", sa.Integer(), server_default=sa.text("0")),
        sa.Column("engagement_rate", sa.Float(), server_default=sa.text("0.0")),
        sa.Column("fetched_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Audit logs
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("entity_type", sa.String(50), nullable=False, index=True),
        sa.Column("entity_id", sa.Integer(), nullable=False),
        sa.Column("action", sa.String(100), nullable=False),
        sa.Column("actor_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("details", sa.JSON(), nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_audit_logs_entity", "audit_logs", ["entity_type", "entity_id"])


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_table("analytics")
    op.drop_table("linkedin_organizations")
    op.drop_table("publish_jobs")
    op.drop_table("approval_history")
    op.drop_table("approvals")
    op.drop_table("creative_assets")
    op.drop_table("creatives")
    op.drop_table("content_requests")
    op.drop_table("role_permission_overrides")
    op.drop_table("user_permissions")
    op.drop_table("refresh_tokens")
    op.drop_table("users")

    op.execute("DROP TYPE IF EXISTS userrole")
    op.execute("DROP TYPE IF EXISTS platform")
    op.execute("DROP TYPE IF EXISTS tone")
    op.execute("DROP TYPE IF EXISTS contentstatus")
    op.execute("DROP TYPE IF EXISTS creativetype")
    op.execute("DROP TYPE IF EXISTS creativestatus")
    op.execute("DROP TYPE IF EXISTS assettype")
    op.execute("DROP TYPE IF EXISTS entitytype")
    op.execute("DROP TYPE IF EXISTS approvallevel")
    op.execute("DROP TYPE IF EXISTS approvalstatus")
    op.execute("DROP TYPE IF EXISTS approvalaction")
    op.execute("DROP TYPE IF EXISTS publishstatus")
    op.execute("DROP TYPE IF EXISTS publishtarget")
