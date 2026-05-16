from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Recommendation
from app.schemas import RecommendationRecord, RecommendationRecordUpdate

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
