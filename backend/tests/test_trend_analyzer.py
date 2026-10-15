import pytest
import numpy as np

from app.services.trend_analyzer import trend_analyzer
from app.models.schemas import AnnualMetric, HazardEvent


def test_mann_kendall_monotonic_upward():
    """Mann-Kendall test should detect strongly upward trend."""
    # Clearly increasing series
    data = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0]
    s, var_s, z, p_val, tau, sens_slope = trend_analyzer.calculate_mann_kendall(data)

    assert s > 0
    assert z > 0
    assert p_val < 0.01  # Highly significant
    assert tau > 0.8
    assert sens_slope > 0.0


def test_mann_kendall_flat():
    """Mann-Kendall test should find no significant trend on flat noise."""
    data = [5.0, 4.0, 6.0, 5.0, 4.0, 6.0, 5.0, 4.0, 6.0, 5.0]
    s, var_s, z, p_val, tau, sens_slope = trend_analyzer.calculate_mann_kendall(data)

    assert p_val > 0.1  # Not significant
    assert abs(tau) < 0.3


def test_trend_analysis_pipeline():
    """Verify full trend analysis pipeline calculation."""
    years = list(range(1990, 2020))
    metrics = []
    for idx, y in enumerate(years):
        # Slowly increasing event counts
        cnt = int(idx // 6)
        metrics.append(AnnualMetric(
            year=y,
            event_count=cnt,
            total_hazard_days=cnt * 4,
            max_duration_days=4 if cnt > 0 else 0,
            mean_intensity=float(cnt * 5),
            annual_max_temp=38.0 + (idx * 0.05),
            annual_mean_temp=22.0 + (idx * 0.03)
        ))

    events = [
        HazardEvent(
            event_id=f"test_{y}",
            year=y,
            start_date=f"{y}-07-01",
            end_date=f"{y}-07-05",
            duration_days=5,
            peak_value=41.2,
            mean_value=39.5,
            intensity_score=15.4,
            severity="Severe"
        )
        for y in range(2000, 2020, 2)
    ]

    stats, summary = trend_analyzer.analyze_trends(
        metrics=metrics,
        events=events,
        start_year=1990,
        end_year=2019,
        hazard_type="heatwave",
        threshold_val=37.5,
        all_time_peak=41.2,
        units="celsius"
    )

    assert stats.linear_slope_per_decade > 0
    assert stats.sens_slope >= 0
    assert "increased by" in summary.headline.lower() or "stable" in summary.headline.lower()
    assert summary.total_events == len(events)
