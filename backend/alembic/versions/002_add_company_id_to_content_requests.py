"""Add company_id to content_requests.

Revision ID: 002_company_id
Revises: 001_initial
Create Date: 2026-04-09

"""
from alembic import op
import sqlalchemy as sa

revision = "002_company_id"
down_revision = "001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "content_requests",
        sa.Column(
            "company_id",
            sa.Integer(),
            sa.ForeignKey("companies.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.create_index("ix_content_requests_company_id", "content_requests", ["company_id"])


def downgrade() -> None:
    op.drop_index("ix_content_requests_company_id", table_name="content_requests")
    op.drop_column("content_requests", "company_id")
