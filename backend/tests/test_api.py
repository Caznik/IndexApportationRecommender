from datetime import date, timedelta, datetime, timezone
from decimal import Decimal
from unittest.mock import patch

from app.models import MarketPrice, Settings, Recommendation
from app.schemas import PricePoint


def _seed_settings(db, base=300.0, min_=100.0, max_=1000.0, ticker="IWDA.AS", risk="balanced"):
    # Use merge() so this works whether the lifespan already seeded id=1 or not.
    db.merge(Settings(
        id=1,
        base_amount=Decimal(str(base)),
        min_amount=Decimal(str(min_)),
        max_amount=Decimal(str(max_)),
        ticker=ticker,
        risk_profile=risk,
    ))
    db.commit()


def _seed_prices(db, ticker="IWDA.AS", days=400, base_price=100.0):
    today = date.today()
    for i in range(days):
        d = today - timedelta(days=i)
        if d.weekday() < 5:
            db.add(MarketPrice(
                ticker=ticker,
                date=d,
                close_price=Decimal(str(round(base_price - i * 0.01, 4))),
            ))
    db.commit()


# --- Settings ---

def test_get_settings_returns_row(client, db):
    _seed_settings(db)
    r = client.get("/api/settings")
    assert r.status_code == 200
    data = r.json()
    assert data["base_amount"] == "300.00"
    assert data["risk_profile"] == "balanced"


def test_put_settings_updates_row(client, db):
    _seed_settings(db)
    r = client.put("/api/settings", json={
        "base_amount": "500.00",
        "min_amount": "200.00",
        "max_amount": "2000.00",
        "ticker": "URTH",
        "risk_profile": "aggressive",
    })
    assert r.status_code == 200
    assert r.json()["base_amount"] == "500.00"
    assert r.json()["ticker"] == "URTH"


def test_get_settings_returns_seeded_defaults(client):
    # Lifespan seeds id=1 with defaults on startup — verify they are present.
    r = client.get("/api/settings")
    assert r.status_code == 200
    assert r.json()["ticker"] == "IWDA.AS"
    assert r.json()["risk_profile"] == "balanced"


# --- History ---

def test_get_history_empty(client, db):
    r = client.get("/api/history")
    assert r.status_code == 200
    assert r.json() == []


# --- Market history ---

def test_get_market_history_returns_prices(client, db):
    _seed_settings(db)
    _seed_prices(db)
    with patch("app.services.market.yf.download") as mock_dl:
        mock_dl.return_value = {}
        r = client.get("/api/market/history")
    assert r.status_code == 200
    data = r.json()
    assert len(data) > 0
    assert "date" in data[0]
    assert "close_price" in data[0]


# --- Recommendation generate ---

def test_generate_recommendation(client, db):
    _seed_settings(db)
    _seed_prices(db, base_price=100.0)
    with patch("app.services.market.yf.download") as mock_dl:
        mock_dl.return_value = {}
        r = client.post("/api/recommendation/generate")
    assert r.status_code == 200
    data = r.json()
    assert "current_price" in data
    assert "drawdown" in data
    assert "drawdown_pct" in data
    assert "multiplier" in data
    assert "recommended_amount" in data
    assert "rule_triggered" in data
    assert "explanation" in data


def test_generate_recommendation_stored_in_history(client, db):
    _seed_settings(db)
    _seed_prices(db)
    with patch("app.services.market.yf.download") as mock_dl:
        mock_dl.return_value = {}
        client.post("/api/recommendation/generate")
        r = client.get("/api/history")
    assert r.status_code == 200
    assert len(r.json()) == 1


# --- PATCH History ---

def _seed_recommendation(db):
    rec = Recommendation(
        created_at=datetime.now(timezone.utc),
        ticker="URTH",
        market_price=Decimal("97.40"),
        drawdown=Decimal("-0.082000"),
        drawdown_pct=Decimal("-8.20"),
        multiplier=Decimal("1.20"),
        rule_triggered="-5% band",
        recommended_amount=Decimal("620.00"),
        executed_amount=None,
        explanation="Market is 8.2% below its 12-month high.",
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return rec


def test_patch_history_sets_executed_amount(client, db):
    rec = _seed_recommendation(db)
    r = client.patch(f"/api/history/{rec.id}", json={"executed_amount": "600.00"})
    assert r.status_code == 200
    assert r.json()["executed_amount"] == "600.00"
    assert r.json()["id"] == rec.id


def test_patch_history_returns_404_for_unknown_id(client, db):
    r = client.patch("/api/history/999", json={"executed_amount": "600.00"})
    assert r.status_code == 404


def test_patch_history_returns_422_for_zero_amount(client, db):
    rec = _seed_recommendation(db)
    r = client.patch(f"/api/history/{rec.id}", json={"executed_amount": "0"})
    assert r.status_code == 422


def test_patch_history_returns_422_for_negative_amount(client, db):
    rec = _seed_recommendation(db)
    r = client.patch(f"/api/history/{rec.id}", json={"executed_amount": "-50"})
    assert r.status_code == 422
