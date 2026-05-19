from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import PricePoint
from app.services.market import ensure_prices_fresh, get_price_history

router = APIRouter(prefix="/api/market", tags=["market"])


@router.get("/history", response_model=list[PricePoint])
def market_history(ticker: str, db: Session = Depends(get_db)):
    ensure_prices_fresh(ticker, db)
    return get_price_history(ticker, 365, db)
