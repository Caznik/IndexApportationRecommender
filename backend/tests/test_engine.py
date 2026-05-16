from decimal import Decimal
from datetime import date, timedelta
from app.schemas import PricePoint, SettingsRead
from app.services.recommendation import calculate_recommendation


def _make_prices(current: float, peak: float, days: int = 365) -> list[PricePoint]:
    today = date.today()
    prices = []
    for i in range(days):
        d = today - timedelta(days=days - 1 - i)
        price = peak if i == 0 else current
        prices.append(PricePoint(date=d, close_price=Decimal(str(price))))
    return prices


def _make_settings(
    base: float = 300.0,
    min_: float = 100.0,
    max_: float = 1000.0,
    risk: str = "balanced",
) -> SettingsRead:
    return SettingsRead(
        id=1,
        base_amount=Decimal(str(base)),
        min_amount=Decimal(str(min_)),
        max_amount=Decimal(str(max_)),
        ticker="IWDA.AS",
        risk_profile=risk,
    )


# --- Balanced profile ---

def test_balanced_no_drawdown():
    prices = _make_prices(current=100.0, peak=100.0)
    result = calculate_recommendation(prices, _make_settings())
    assert result.multiplier == Decimal("1.0")
    assert result.rule_triggered == "DD_0_5"
    assert result.recommended_amount == Decimal("300.00")


def test_balanced_dd_5_10():
    prices = _make_prices(current=93.0, peak=100.0)  # -7%
    result = calculate_recommendation(prices, _make_settings())
    assert result.multiplier == Decimal("1.2")
    assert result.rule_triggered == "DD_5_10"
    assert result.recommended_amount == Decimal("360.00")


def test_balanced_dd_10_20():
    prices = _make_prices(current=87.0, peak=100.0)  # -13%
    result = calculate_recommendation(prices, _make_settings())
    assert result.multiplier == Decimal("1.4")
    assert result.rule_triggered == "DD_10_20"
    assert result.recommended_amount == Decimal("420.00")


def test_balanced_dd_gt_20():
    prices = _make_prices(current=75.0, peak=100.0)  # -25%
    result = calculate_recommendation(prices, _make_settings())
    assert result.multiplier == Decimal("1.8")
    assert result.rule_triggered == "DD_GT_20"
    assert result.recommended_amount == Decimal("540.00")


# --- Conservative profile ---

def test_conservative_dd_5_10():
    prices = _make_prices(current=93.0, peak=100.0)
    result = calculate_recommendation(prices, _make_settings(risk="conservative"))
    assert result.multiplier == Decimal("1.1")
    assert result.recommended_amount == Decimal("330.00")


def test_conservative_dd_gt_20():
    prices = _make_prices(current=75.0, peak=100.0)
    result = calculate_recommendation(prices, _make_settings(risk="conservative"))
    assert result.multiplier == Decimal("1.5")
    assert result.recommended_amount == Decimal("450.00")


# --- Aggressive profile ---

def test_aggressive_dd_10_20():
    prices = _make_prices(current=87.0, peak=100.0)
    result = calculate_recommendation(prices, _make_settings(risk="aggressive"))
    assert result.multiplier == Decimal("2.0")
    assert result.recommended_amount == Decimal("600.00")


def test_aggressive_dd_gt_20():
    prices = _make_prices(current=75.0, peak=100.0)
    result = calculate_recommendation(prices, _make_settings(risk="aggressive"))
    assert result.multiplier == Decimal("2.5")
    assert result.recommended_amount == Decimal("750.00")


# --- Clamping ---

def test_clamp_to_max():
    prices = _make_prices(current=75.0, peak=100.0)
    result = calculate_recommendation(prices, _make_settings(base=300.0, max_=500.0, risk="aggressive"))
    assert result.recommended_amount == Decimal("500.00")  # 750 clamped to 500


def test_clamp_to_min():
    prices = _make_prices(current=100.0, peak=100.0)
    result = calculate_recommendation(prices, _make_settings(base=50.0, min_=100.0))
    assert result.recommended_amount == Decimal("100.00")  # 50 clamped to 100


# --- Drawdown calculation ---

def test_drawdown_formula():
    prices = _make_prices(current=87.0, peak=100.0)
    result = calculate_recommendation(prices, _make_settings())
    assert result.drawdown == Decimal("-0.130000")
    assert result.drawdown_pct == Decimal("-13.00")


# --- Explanation ---

def test_explanation_contains_drawdown_pct():
    prices = _make_prices(current=87.0, peak=100.0)
    result = calculate_recommendation(prices, _make_settings())
    assert "13.0" in result.explanation
