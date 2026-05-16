from datetime import datetime, date, timezone
from decimal import Decimal
from sqlalchemy import (
    Integer, String, Numeric, Date, DateTime, Text,
    UniqueConstraint, func
)
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class Settings(Base):
    __tablename__ = "settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    base_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    min_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    max_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    ticker: Mapped[str] = mapped_column(String(20), nullable=False, default="IWDA.AS")
    risk_profile: Mapped[str] = mapped_column(String(20), nullable=False, default="balanced")


class MarketPrice(Base):
    __tablename__ = "market_prices"
    __table_args__ = (UniqueConstraint("ticker", "date", name="uq_ticker_date"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ticker: Mapped[str] = mapped_column(String(20), nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    close_price: Mapped[Decimal] = mapped_column(Numeric(12, 4), nullable=False)


class Recommendation(Base):
    __tablename__ = "recommendations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        default=lambda: datetime.now(timezone.utc),
    )
    ticker: Mapped[str] = mapped_column(String(20), nullable=False)
    market_price: Mapped[Decimal] = mapped_column(Numeric(12, 4), nullable=False)
    drawdown: Mapped[Decimal] = mapped_column(Numeric(8, 6), nullable=False)  # fraction, e.g. -0.123
    drawdown_pct: Mapped[Decimal] = mapped_column(Numeric(6, 2), nullable=False)
    multiplier: Mapped[Decimal] = mapped_column(Numeric(4, 2), nullable=False)
    rule_triggered: Mapped[str] = mapped_column(String(20), nullable=False)
    recommended_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    executed_amount: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    explanation: Mapped[str] = mapped_column(Text, nullable=False)
