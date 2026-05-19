from datetime import datetime, date
from decimal import Decimal
from typing import Annotated, Literal, Union

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class SettingsRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    base_amount: Decimal
    min_amount: Decimal
    max_amount: Decimal
    ticker: str
    risk_profile: str


class SettingsUpdate(BaseModel):
    """PUT body — updates amounts and risk profile. Ticker is the URL key."""
    base_amount: Decimal
    min_amount: Decimal
    max_amount: Decimal
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


class SettingsCreate(BaseModel):
    """POST body — creates a new ticker profile."""
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
    def min_lte_max(self) -> "SettingsCreate":
        if self.min_amount > self.max_amount:
            raise ValueError("min_amount must not exceed max_amount")
        return self

    @field_validator("ticker")
    @classmethod
    def normalize_ticker(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("ticker must not be empty")
        if len(stripped) > 20:
            raise ValueError("ticker must not exceed 20 characters")
        return stripped.upper()


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


class OutcomeAvailable(BaseModel):
    status: Literal["available"]
    price: Decimal
    pct: Decimal


class OutcomePending(BaseModel):
    status: Literal["pending"]
    days_remaining: int


OutcomeSnapshot = Annotated[
    Union[OutcomeAvailable, OutcomePending],
    Field(discriminator="status"),
]


class OutcomeResponse(BaseModel):
    one_m: OutcomeSnapshot
    three_m: OutcomeSnapshot
    six_m: OutcomeSnapshot
