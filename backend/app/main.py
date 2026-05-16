from contextlib import asynccontextmanager
from decimal import Decimal

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from sqlalchemy import select

from app.database import SessionLocal, engine
from app.models import Settings
from app.routers import history, market, recommendation, settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    db: Session = SessionLocal()
    try:
        row = db.execute(select(Settings).where(Settings.id == 1)).scalar_one_or_none()
        if row is None:
            db.add(Settings(
                id=1,
                base_amount=Decimal("300.00"),
                min_amount=Decimal("100.00"),
                max_amount=Decimal("1000.00"),
                ticker="IWDA.AS",
                risk_profile="balanced",
            ))
            db.commit()
    finally:
        db.close()
    yield


app = FastAPI(title="IndexApportationRecommender API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(settings.router)
app.include_router(recommendation.router)
app.include_router(history.router)
app.include_router(market.router)
