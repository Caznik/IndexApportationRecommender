from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Recommendation
from app.schemas import RecommendationRecord

router = APIRouter(prefix="/api/history", tags=["history"])


@router.get("", response_model=list[RecommendationRecord])
def get_history(db: Session = Depends(get_db)):
    rows = db.execute(
        select(Recommendation).order_by(Recommendation.created_at.desc())
    ).scalars().all()
    return rows
