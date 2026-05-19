from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import RecommendationResult
from app.services.recommendation import generate_recommendation

router = APIRouter(prefix="/api/recommendation", tags=["recommendation"])


@router.post("/generate", response_model=RecommendationResult)
def generate(ticker: str, db: Session = Depends(get_db)):
    return generate_recommendation(db, ticker)
