import math
from typing import List, Tuple
import numpy as np
from scipy import stats

from app.models.schemas import AnnualMetric, TrendStatistics, HazardSummary, HazardEvent


class ClimateTrendAnalyzer:
    """
    Applies scientific statistical trend detection:
    - Ordinary Least Squares Linear Regression
    - Non-parametric Mann-Kendall Trend Test
    - Sen's Non-Parametric Slope Estimator
    - Decadal and baseline vs recent comparative metrics
    """

    @staticmethod
    def calculate_mann_kendall(data: List[float]) -> Tuple[float, float, float, float, float, float]:
        """
        Computes the Mann-Kendall monotonic trend test with tie adjustments.
        Returns: (S, Var(S), Z, p-value, Kendall's tau, Sen's slope)
        """
        n = len(data)
        if n < 4:
            return 0.0, 0.0, 0.0, 1.0, 0.0, 0.0

        # Calculate S
        s = 0
        slopes = []
        for k in range(n - 1):
            for j in range(k + 1, n):
                diff = data[j] - data[k]
                if diff > 0:
                    s += 1
                elif diff < 0:
                    s -= 1
                slopes.append(diff / (j - k))

        # Tie adjustment for variance
        vals, counts = np.unique(data, return_counts=True)
        tie_sum = sum(t * (t - 1) * (2 * t + 5) for t in counts if t > 1)
        var_s = (n * (n - 1) * (2 * n + 5) - tie_sum) / 18.0

        # Compute standardized test statistic Z
        if s > 0:
            z = (s - 1) / math.sqrt(var_s) if var_s > 0 else 0.0
        elif s < 0:
            z = (s + 1) / math.sqrt(var_s) if var_s > 0 else 0.0
        else:
            z = 0.0

        # Two-tailed p-value from standard normal distribution
        p_val = float(2.0 * (1.0 - stats.norm.cdf(abs(z))))

        # Kendall's tau
        tau = float((2.0 * s) / (n * (n - 1)))

        # Sen's slope (median of all pairwise slopes)
        sens_slope = float(np.median(slopes)) if slopes else 0.0

        return float(s), float(var_s), float(z), p_val, tau, sens_slope

    @classmethod
    def analyze_trends(
        cls,
        metrics: List[AnnualMetric],
        events: List[HazardEvent],
        start_year: int,
        end_year: int,
        hazard_type: str,
        threshold_val: float,
        all_time_peak: float,
        units: str
    ) -> Tuple[TrendStatistics, HazardSummary]:
        """
        Evaluates linear regression and Mann-Kendall statistics across annual time series.
        Builds rigorous summary insights.
        """
        years = [m.year for m in metrics]
        counts = [float(m.event_count) for m in metrics]
        days = [float(m.total_hazard_days) for m in metrics]
        n = len(years)

        # 1. Linear regression on event frequency
        if n >= 2:
            x = np.array(years, dtype=float)
            y = np.array(counts, dtype=float)
            res = stats.linregress(x, y)
            linear_slope = float(res.slope)
            linear_intercept = float(res.intercept)
            r_sq = float(res.rvalue ** 2)
            lin_p_val = float(res.pvalue)
        else:
            linear_slope, linear_intercept, r_sq, lin_p_val = 0.0, 0.0, 0.0, 1.0

        # 2. Mann-Kendall Trend Test
        s, var_s, z, mk_p_val, tau, sens_slope = cls.calculate_mann_kendall(counts)

        # Qualitative trend direction verdict based on statistical significance (alpha = 0.05)
        is_significant = mk_p_val < 0.05
        if is_significant:
            trend_dir = "Increasing" if z > 0 else "Decreasing"
        else:
            trend_dir = "No Significant Trend"

        # 3. Comparative baseline vs recent period
        # Choose baseline and recent windows (e.g. 10 years or 1/3 of the period)
        window_size = max(5, min(10, n // 3))
        baseline_counts = counts[:window_size]
        recent_counts = counts[-window_size:]

        baseline_years_label = f"{years[0]}–{years[window_size - 1]}"
        recent_years_label = f"{years[-window_size]}–{years[-1]}"

        baseline_mean = float(np.mean(baseline_counts)) if baseline_counts else 0.0
        recent_mean = float(np.mean(recent_counts)) if recent_counts else 0.0

        # Percentage change
        if baseline_mean > 0:
            percent_change = ((recent_mean - baseline_mean) / baseline_mean) * 100.0
        elif recent_mean > 0:
            percent_change = 100.0
        else:
            percent_change = 0.0

        trend_stats = TrendStatistics(
            linear_slope_per_decade=round(linear_slope * 10.0, 3),
            linear_slope_per_year=round(linear_slope, 4),
            linear_intercept=round(linear_intercept, 3),
            r_squared=round(r_sq, 4),
            linear_p_value=round(lin_p_val, 4),
            mann_kendall_s=round(s, 1),
            mann_kendall_var_s=round(var_s, 1),
            mann_kendall_z=round(z, 3),
            mann_kendall_p=round(mk_p_val, 4),
            kendall_tau=round(tau, 3),
            sens_slope=round(sens_slope, 4),
            trend_direction=trend_dir,
            is_statistically_significant=is_significant,
            percent_change_since_baseline=round(percent_change, 1),
            baseline_period_label=baseline_years_label,
            recent_period_label=recent_years_label,
            baseline_annual_mean=round(baseline_mean, 2),
            recent_annual_mean=round(recent_mean, 2)
        )

        # 4. Synthesize Summary Takeaways
        total_events = len(events)
        total_days = sum(e.duration_days for e in events)
        avg_dur = round(float(np.mean([e.duration_days for e in events])), 1) if events else 0.0

        longest_event = max(events, key=lambda e: e.duration_days) if events else None

        unit_str = "°F" if units == "fahrenheit" else "°C"
        hazard_name_plural = "Heatwaves" if hazard_type == "heatwave" else ("Dry spells" if hazard_type == "drought" else "Heavy rainfall events")

        # Create honest, scientifically grounded headlines
        if percent_change > 0:
            headline = f"{hazard_name_plural} have increased by {abs(percent_change):.1f}% in this region since {start_year}."
        elif percent_change < 0:
            headline = f"{hazard_name_plural} have decreased by {abs(percent_change):.1f}% in this region since {start_year}."
        else:
            headline = f"{hazard_name_plural} frequency has remained stable in this region since {start_year}."

        sig_text = "confirmed by Mann-Kendall test (p < 0.05)" if is_significant else "not statistically significant (p = " + f"{mk_p_val:.3f})"
        subheadline = (
            f"Averaged {baseline_mean:.1f} events/yr ({baseline_years_label}) vs "
            f"{recent_mean:.1f} events/yr ({recent_years_label}); trend is {sig_text}."
        )

        summary = HazardSummary(
            headline=headline,
            subheadline=subheadline,
            total_events=total_events,
            total_hazard_days=total_days,
            average_duration_days=avg_dur,
            all_time_peak_value=all_time_peak,
            threshold_value=threshold_val,
            longest_event=longest_event
        )

        return trend_stats, summary


trend_analyzer = ClimateTrendAnalyzer()
