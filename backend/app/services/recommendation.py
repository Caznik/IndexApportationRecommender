from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Recommendation, Settings
from app.schemas import PricePoint, RecommendationResult, SettingsRead
from app.services.market import ensure_prices_fresh, get_price_history

MULTIPLIERS: dict[str, list[tuple[float, Decimal, str]]] = {
    "conservative": [
        (-0.20, Decimal("1.5"), "DD_GT_20"),
        (-0.10, Decimal("1.2"), "DD_10_20"),
        (-0.05, Decimal("1.1"), "DD_5_10"),
        (0.0,   Decimal("1.0"), "DD_0_5"),
    ],
    "balanced": [
        (-0.20, Decimal("1.8"), "DD_GT_20"),
        (-0.10, Decimal("1.4"), "DD_10_20"),
        (-0.05, Decimal("1.2"), "DD_5_10"),
        (0.0,   Decimal("1.0"), "DD_0_5"),
    ],
    "aggressive": [
        (-0.20, Decimal("2.5"), "DD_GT_20"),
        (-0.10, Decimal("2.0"), "DD_10_20"),
        (-0.05, Decimal("1.5"), "DD_5_10"),
        (0.0,   Decimal("1.0"), "DD_0_5"),
    ],
}


def calculate_recommendation(
    prices: list[PricePoint],
    settings: SettingsRead,
) -> RecommendationResult:
    if not prices:
        raise ValueError("prices list must not be empty")
    closes = [p.close_price for p in prices]
    current_price = closes[-1]
    max_12m = max(closes)

    drawdown = (current_price - max_12m) / max_12m
    drawdown = drawdown.quantize(Decimal("0.000001"), rounding=ROUND_HALF_UP)
    drawdown_pct = (drawdown * 100).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    table = MULTIPLIERS.get(settings.risk_profile, MULTIPLIERS["balanced"])
    multiplier, rule = Decimal("1.0"), "DD_0_5"
    for threshold, mult, key in table:
        if float(drawdown) <= threshold:
            multiplier, rule = mult, key
            break

    raw = settings.base_amount * multiplier
    recommended = max(settings.min_amount, min(settings.max_amount, raw))
    recommended = recommended.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    explanation = (
        f"Market is {abs(float(drawdown_pct)):.1f}% below its 12-month high."
        if drawdown < 0
        else "Market is at or near its 12-month high."
    )

    return RecommendationResult(
        current_price=current_price,
        drawdown=drawdown,
        drawdown_pct=drawdown_pct,
        multiplier=multiplier,
        recommended_amount=recommended,
        rule_triggered=rule,
        explanation=explanation,
    )


def generate_recommendation(db: Session) -> RecommendationResult:
    settings_row = db.execute(select(Settings).where(Settings.id == 1)).scalar_one_or_none()
    if settings_row is None:
        raise HTTPException(status_code=404, detail="Settings not initialised")
    settings = SettingsRead.model_validate(settings_row)

    ensure_prices_fresh(settings.ticker, db)
    prices = get_price_history(settings.ticker, 365, db)
    if not prices:
        raise HTTPException(status_code=503, detail="No market data available for ticker")

    result = calculate_recommendation(prices, settings)

    rec = Recommendation(
        created_at=datetime.now(timezone.utc),
        ticker=settings.ticker,
        market_price=result.current_price,
        drawdown=result.drawdown,
        drawdown_pct=result.drawdown_pct,
        multiplier=result.multiplier,
        rule_triggered=result.rule_triggered,
        recommended_amount=result.recommended_amount,
        executed_amount=None,
        explanation=result.explanation,
    )
    db.add(rec)
    db.commit()
    return result
