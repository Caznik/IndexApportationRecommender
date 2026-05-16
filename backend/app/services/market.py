import math
from datetime import date, timedelta
from decimal import Decimal

import yfinance as yf
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import MarketPrice
from app.schemas import PricePoint


def _has_today(ticker: str, db: Session) -> bool:
    today = date.today()
    row = db.execute(
        select(MarketPrice).where(
            MarketPrice.ticker == ticker,
            MarketPrice.date == today,
        )
    ).first()
    return row is not None


def _has_any(ticker: str, db: Session) -> bool:
    row = db.execute(select(MarketPrice).where(MarketPrice.ticker == ticker).limit(1)).first()
    return row is not None


def _upsert_prices(ticker: str, df, db: Session) -> None:
    if df is None or df.empty:
        return
    # yfinance returns MultiIndex columns when auto_adjust=True
    try:
        closes = df["Close"][ticker]
    except (KeyError, TypeError):
        try:
            closes = df["Close"]
        except KeyError:
            return

    rows = [
        {"ticker": ticker, "date": d.date(), "close_price": Decimal(str(round(float(v), 4)))}
        for d, v in closes.items()
        if v is not None and not (hasattr(v, "__float__") and math.isnan(float(v)))
    ]
    if not rows:
        return

    dialect = db.get_bind().dialect.name
    if dialect == "sqlite":
        from sqlalchemy.dialects.sqlite import insert as dialect_insert
    else:
        from sqlalchemy.dialects.postgresql import insert as dialect_insert

    stmt = dialect_insert(MarketPrice).values(rows).on_conflict_do_nothing(
        index_elements=["ticker", "date"]
    )
    db.execute(stmt)
    db.commit()


def ensure_prices_fresh(ticker: str, db: Session) -> None:
    if _has_today(ticker, db):
        return
    period = "7d" if _has_any(ticker, db) else "3y"
    df = yf.download(ticker, period=period, auto_adjust=True, progress=False)
    _upsert_prices(ticker, df, db)


def get_latest_price(ticker: str, db: Session) -> Decimal:
    # Precondition: ensure_prices_fresh must be called before this function.
    row = db.execute(
        select(MarketPrice)
        .where(MarketPrice.ticker == ticker)
        .order_by(MarketPrice.date.desc())
        .limit(1)
    ).scalar_one()
    return row.close_price


def get_price_history(ticker: str, days: int, db: Session) -> list[PricePoint]:
    cutoff = date.today() - timedelta(days=days - 1)
    rows = db.execute(
        select(MarketPrice)
        .where(MarketPrice.ticker == ticker, MarketPrice.date >= cutoff)
        .order_by(MarketPrice.date.asc())
    ).scalars().all()
    return [PricePoint.model_validate(r) for r in rows]
