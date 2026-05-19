from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Settings
from app.schemas import SettingsCreate, SettingsRead, SettingsUpdate

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("", response_model=list[SettingsRead])
def list_settings(db: Session = Depends(get_db)):
    rows = db.execute(select(Settings).order_by(Settings.ticker)).scalars().all()
    return rows


@router.post("", response_model=SettingsRead, status_code=201)
def create_settings(body: SettingsCreate, db: Session = Depends(get_db)):
    existing = db.execute(
        select(Settings).where(Settings.ticker == body.ticker)
    ).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(status_code=409, detail=f"Ticker {body.ticker} already exists")
    row = Settings(
        ticker=body.ticker,
        base_amount=body.base_amount,
        min_amount=body.min_amount,
        max_amount=body.max_amount,
        risk_profile=body.risk_profile,
    )
    db.add(row)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail=f"Ticker {body.ticker} already exists")
    db.refresh(row)
    return row


@router.get("/{ticker}", response_model=SettingsRead)
def get_settings(ticker: str, db: Session = Depends(get_db)):
    row = db.execute(
        select(Settings).where(Settings.ticker == ticker.upper())
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail=f"Ticker {ticker} not found")
    return row


@router.put("/{ticker}", response_model=SettingsRead)
def update_settings(ticker: str, body: SettingsUpdate, db: Session = Depends(get_db)):
    row = db.execute(
        select(Settings).where(Settings.ticker == ticker.upper())
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail=f"Ticker {ticker} not found")
    row.base_amount = body.base_amount
    row.min_amount = body.min_amount
    row.max_amount = body.max_amount
    row.risk_profile = body.risk_profile
    db.commit()
    db.refresh(row)
    return row


@router.delete("/{ticker}", status_code=204)
def delete_settings(ticker: str, db: Session = Depends(get_db)):
    row = db.execute(
        select(Settings).where(Settings.ticker == ticker.upper())
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail=f"Ticker {ticker} not found")
    db.delete(row)
    db.commit()
    return Response(status_code=204)
