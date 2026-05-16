"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-05-14
"""
from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "settings",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("base_amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("min_amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("max_amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("ticker", sa.String(20), nullable=False),
        sa.Column("risk_profile", sa.String(20), nullable=False),
    )
    op.create_table(
        "market_prices",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("ticker", sa.String(20), nullable=False),
        sa.Column("date", sa.Date, nullable=False),
        sa.Column("close_price", sa.Numeric(12, 4), nullable=False),
        sa.UniqueConstraint("ticker", "date", name="uq_ticker_date"),
    )
    op.create_table(
        "recommendations",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("ticker", sa.String(20), nullable=False),
        sa.Column("market_price", sa.Numeric(12, 4), nullable=False),
        sa.Column("drawdown", sa.Numeric(8, 6), nullable=False),
        sa.Column("drawdown_pct", sa.Numeric(6, 2), nullable=False),
        sa.Column("multiplier", sa.Numeric(4, 2), nullable=False),
        sa.Column("rule_triggered", sa.String(20), nullable=False),
        sa.Column("recommended_amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("executed_amount", sa.Numeric(10, 2), nullable=True),
        sa.Column("explanation", sa.Text, nullable=False),
    )


def downgrade() -> None:
    op.drop_table("recommendations")
    op.drop_table("market_prices")
    op.drop_table("settings")
