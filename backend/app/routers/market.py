from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Settings
from app.schemas import PricePoint
from app.services.market import ensure_prices_fresh, get_price_history

router = APIRouter(prefix="/api/market", tags=["market"])


@router.get("/history", response_model=list[PricePoint])
def market_history(db: Session = Depends(get_db)):
    settings = db.execute(select(Settings).where(Settings.id == 1)).scalar_one_or_none()
    if settings is None:
        raise HTTPException(status_code=404, detail="Settings not initialised")
    ensure_prices_fresh(settings.ticker, db)
    return get_price_history(settings.ticker, 365, db)
