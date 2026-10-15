import pytest
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

from app.services.hazard_detector import hazard_detector


def create_synthetic_weather_df(days: int = 365 * 10, base_temp: float = 25.0):
    """Generate deterministic synthetic daily temperature data."""
    start_date = datetime(2000, 1, 1)
    dates = [start_date + timedelta(days=i) for i in range(days)]

    # Seasonal variation + slight warming trend + random noise
    t = np.arange(days)
    seasonal = 10.0 * np.sin(2 * np.pi * t / 365.25)
    trend = 0.001 * t
    rng = np.random.RandomState(42)
    noise = rng.normal(0, 2.0, days)

    tmax = base_temp + seasonal + trend + noise

    # Inject an intentional 5-day extreme heatwave in year 2005 (day ~2000)
    tmax[2000:2005] = 45.0

    df = pd.DataFrame({
        "time": dates,
        "temperature_2m_max": tmax,
        "temperature_2m_min": tmax - 10.0,
        "temperature_2m_mean": tmax - 5.0,
        "precipitation_sum": rng.exponential(1.5, days)
    })
    return df


def test_detect_heatwaves():
    """Verify heatwave detection finds intentional 5-day heatwave."""
    df = create_synthetic_weather_df(days=365 * 10)
    events, metrics, threshold, peak = hazard_detector.detect_heatwaves(
        df=df,
        percentile_threshold=95.0,
        min_consecutive_days=3,
        units="celsius"
    )

    assert len(events) >= 1
    assert threshold > 20.0
    assert peak >= 45.0

    # Ensure the injected 5-day heatwave was captured
    injected_detected = any(e.duration_days >= 5 and e.peak_value >= 44.0 for e in events)
    assert injected_detected is True

    # Check annual metrics
    assert len(metrics) == 10
    total_events_in_metrics = sum(m.event_count for m in metrics)
    assert total_events_in_metrics == len(events)


def test_heatwave_units_conversion():
    """Verify conversion to Fahrenheit."""
    df = create_synthetic_weather_df(days=365 * 5)
    events_c, _, thresh_c, peak_c = hazard_detector.detect_heatwaves(df, units="celsius")
    events_f, _, thresh_f, peak_f = hazard_detector.detect_heatwaves(df, units="fahrenheit")

    assert thresh_f > thresh_c
    expected_peak_f = round(peak_c * 9.0 / 5.0 + 32.0, 1)
    assert abs(peak_f - expected_peak_f) < 0.2
