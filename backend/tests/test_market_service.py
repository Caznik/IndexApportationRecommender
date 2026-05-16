from datetime import date, timedelta
from decimal import Decimal
from app.models import MarketPrice, Settings
from app.services.market import ensure_prices_fresh, get_latest_price, get_price_history


def _insert_prices(db, ticker: str, days: int, base_price: float = 100.0):
    today = date.today()
    for i in range(days):
        d = today - timedelta(days=i)
        if d.weekday() < 5:  # skip weekends
            db.add(MarketPrice(ticker=ticker, date=d, close_price=Decimal(str(base_price - i * 0.1))))
    db.commit()


def test_get_latest_price_returns_most_recent(db):
    _insert_prices(db, "IWDA.AS", 10)
    price = get_latest_price("IWDA.AS", db)
    assert price == get_price_history("IWDA.AS", 1, db)[0].close_price


def test_get_price_history_returns_correct_count(db):
    _insert_prices(db, "IWDA.AS", 30)
    history = get_price_history("IWDA.AS", 30, db)
    assert len(history) > 0
    assert all(h.close_price > 0 for h in history)


def test_ensure_prices_fresh_skips_fetch_when_today_exists(db, monkeypatch):
    today = date.today()
    db.add(MarketPrice(ticker="IWDA.AS", date=today, close_price=Decimal("105.00")))
    db.commit()

    called = []

    def mock_download(*args, **kwargs):
        called.append(True)
        return {}

    monkeypatch.setattr("app.services.market.yf.download", mock_download)
    ensure_prices_fresh("IWDA.AS", db)
    assert called == [], "yfinance should not be called when today's price exists"


def test_ensure_prices_fresh_calls_yfinance_when_stale(db, monkeypatch):
    import pandas as pd

    yesterday = date.today() - timedelta(days=1)
    db.add(MarketPrice(ticker="IWDA.AS", date=yesterday, close_price=Decimal("104.00")))
    db.commit()

    mock_data = pd.DataFrame(
        {"Close": [105.0]},
        index=pd.to_datetime([date.today().isoformat()])
    )
    mock_data.columns = pd.MultiIndex.from_tuples([("Close", "IWDA.AS")])

    def mock_download(*args, **kwargs):
        return mock_data

    monkeypatch.setattr("app.services.market.yf.download", mock_download)
    ensure_prices_fresh("IWDA.AS", db)

    price = get_latest_price("IWDA.AS", db)
    assert price == Decimal("105.0000")
