"""add unique constraint on settings.ticker

Revision ID: 0002
Revises: 0001
Create Date: 2026-05-19
"""
from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_unique_constraint("uq_settings_ticker", "settings", ["ticker"])


def downgrade() -> None:
    op.drop_constraint("uq_settings_ticker", "settings", type_="unique")
