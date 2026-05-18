from datetime import date, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Recommendation
from app.schemas import (
    OutcomeAvailable,
    OutcomePending,
    OutcomeResponse,
    RecommendationRecord,
    RecommendationRecordUpdate,
)
from app.services.market import get_price_at_or_before

router = APIRouter(prefix="/api/history", tags=["history"])


@router.get("", response_model=list[RecommendationRecord])
def get_history(db: Session = Depends(get_db)):
    rows = db.execute(
        select(Recommendation).order_by(Recommendation.created_at.desc())
    ).scalars().all()
    return rows


@router.patch("/{rec_id}", response_model=RecommendationRecord)
def mark_executed(rec_id: int, body: RecommendationRecordUpdate, db: Session = Depends(get_db)):
    rec = db.get(Recommendation, rec_id)
    if rec is None:
        raise HTTPException(status_code=404, detail="Recommendation not found")
    rec.executed_amount = body.executed_amount
    db.commit()
    db.refresh(rec)
    return rec


@router.get("/{rec_id}/outcomes", response_model=OutcomeResponse)
def get_outcomes(rec_id: int, db: Session = Depends(get_db)):
    rec = db.get(Recommendation, rec_id)
    if rec is None or rec.executed_amount is None:
        raise HTTPException(status_code=404, detail="Recommendation not found or not executed")

    today = date.today()
    rec_date = rec.created_at.date()

    def _snapshot(days: int):
        target = rec_date + timedelta(days=days)
        remaining = (target - today).days
        if remaining > 0:
            return OutcomePending(status="pending", days_remaining=remaining)
        future_price = get_price_at_or_before(rec.ticker, target, db)
        if future_price is None:
            # Window elapsed but price not yet in DB — surface as pending rather than error
            return OutcomePending(status="pending", days_remaining=0)
        pct = round(
            (future_price - rec.market_price) / rec.market_price * Decimal("100"),
            2,
        )
        return OutcomeAvailable(status="available", price=future_price, pct=pct)

    return OutcomeResponse(
        one_m=_snapshot(30),
        three_m=_snapshot(90),
        six_m=_snapshot(180),
    )
