from datetime import datetime, date
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, field_validator, model_validator


class SettingsRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    base_amount: Decimal
    min_amount: Decimal
    max_amount: Decimal
    ticker: str
    risk_profile: str


class SettingsUpdate(BaseModel):
    base_amount: Decimal
    min_amount: Decimal
    max_amount: Decimal
    ticker: str
    risk_profile: Literal["conservative", "balanced", "aggressive"]

    @field_validator("base_amount", "min_amount", "max_amount")
    @classmethod
    def must_be_positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("must be greater than 0")
        return v

    @model_validator(mode="after")
    def min_lte_max(self) -> "SettingsUpdate":
        if self.min_amount > self.max_amount:
            raise ValueError("min_amount must not exceed max_amount")
        return self


class RecommendationResult(BaseModel):
    current_price: Decimal
    drawdown: Decimal
    drawdown_pct: Decimal
    multiplier: Decimal
    recommended_amount: Decimal
    rule_triggered: str
    explanation: str


class RecommendationRecord(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    ticker: str
    market_price: Decimal
    drawdown: Decimal
    drawdown_pct: Decimal
    multiplier: Decimal
    rule_triggered: str
    recommended_amount: Decimal
    executed_amount: Decimal | None
    explanation: str


class RecommendationRecordUpdate(BaseModel):
    executed_amount: Decimal

    @field_validator("executed_amount")
    @classmethod
    def must_be_positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("must be greater than 0")
        return v


class PricePoint(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    date: date
    close_price: Decimal
