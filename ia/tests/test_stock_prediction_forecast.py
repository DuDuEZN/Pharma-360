"""Tests unitaires des calculs de prévision (sans accès base de données)."""

from datetime import date, timedelta

from ia.services.stock_prediction import (
    _risk_level,
    _trend_label,
    build_daily_series,
    forecast_series,
)


def test_build_daily_series_fills_missing_days():
    start = date(2026, 1, 1)
    totals = {start: 5, start + timedelta(days=2): 7}
    assert build_daily_series(totals, start, 4) == [5, 0, 7, 0]


def test_build_daily_series_ignores_dates_outside_window():
    start = date(2026, 1, 1)
    totals = {start - timedelta(days=1): 99, start: 3}
    assert build_daily_series(totals, start, 2) == [3, 0]


def test_forecast_series_returns_requested_horizon():
    series = [10] * 30
    forecast = forecast_series(series, 7)
    assert len(forecast) == 7
    assert all(value >= 0 for value in forecast)


def test_forecast_series_empty_history_is_zero():
    assert forecast_series([], 5) == [0, 0, 0, 0, 0]


def test_forecast_series_is_bounded():
    # Série strictement croissante : la projection reste plafonnée.
    series = list(range(1, 31))
    forecast = forecast_series(series, 10)
    cap = max(sum(series) / len(series) * 5, 1.0)
    assert all(0 <= value <= cap for value in forecast)


def test_risk_level_thresholds():
    assert _risk_level(0) == "CRITICAL"
    assert _risk_level(3) == "CRITICAL"
    assert _risk_level(5) == "HIGH"
    assert _risk_level(20) == "MEDIUM"
    assert _risk_level(120) == "LOW"


def test_trend_label_thresholds():
    assert _trend_label(120, 100) == "increasing"
    assert _trend_label(80, 100) == "decreasing"
    assert _trend_label(102, 100) == "stable"
    assert _trend_label(0, 0) == "stable"
    assert _trend_label(10, 0) == "increasing"
