from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Settings
from app.schemas import SettingsRead, SettingsUpdate

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("", response_model=SettingsRead)
def get_settings(db: Session = Depends(get_db)):
    row = db.execute(select(Settings).where(Settings.id == 1)).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Settings not initialised")
    return row


@router.put("", response_model=SettingsRead)
def update_settings(body: SettingsUpdate, db: Session = Depends(get_db)):
    row = db.execute(select(Settings).where(Settings.id == 1)).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Settings not initialised")
    row.base_amount = body.base_amount
    row.min_amount = body.min_amount
    row.max_amount = body.max_amount
    row.ticker = body.ticker
    row.risk_profile = body.risk_profile
    db.commit()
    db.refresh(row)
    return row
