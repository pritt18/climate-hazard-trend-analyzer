import uuid
from typing import List, Tuple, Dict, Any
import numpy as np
import pandas as pd

from app.models.schemas import HazardEvent, AnnualMetric


class ClimateHazardDetector:
    """
    Applies domain-specific climatological algorithms to detect and quantify climate hazards:
    1. Heatwaves (WMO/IPCC standard: consecutive days with Tmax >= 95th percentile)
    2. Droughts (Meteorological dry spells: consecutive days with precip < 1.0mm)
    3. Heavy Rainfall (Extreme precipitation events >= 95th percentile)
    """

    @staticmethod
    def detect_heatwaves(
        df: pd.DataFrame,
        percentile_threshold: float = 95.0,
        min_consecutive_days: int = 3,
        units: str = "celsius"
    ) -> Tuple[List[HazardEvent], List[AnnualMetric], float, float]:
        """
        Detect heatwaves using percentile-based thresholding and consecutive day clustering.
        Returns:
            - List of individual HazardEvent records
            - List of AnnualMetric aggregates
            - Threshold temperature value (°C or °F)
            - All-time peak temperature (°C or °F)
        """
        if df.empty or "temperature_2m_max" not in df.columns:
            return [], [], 0.0, 0.0

        work_df = df.copy()
        work_df = work_df.sort_values("time").reset_index(drop=True)

        # Baseline Climatology Threshold: e.g. 95th percentile of daily maximums
        threshold_val_c = float(np.percentile(work_df["temperature_2m_max"].dropna(), percentile_threshold))
        all_time_peak_c = float(work_df["temperature_2m_max"].max())
        p98_val_c = float(np.percentile(work_df["temperature_2m_max"].dropna(), 98.0))

        # Flag days exceeding threshold
        work_df["is_hot_day"] = work_df["temperature_2m_max"] >= threshold_val_c

        events: List[HazardEvent] = []

        # Find contiguous runs of hot days
        hot_mask = work_df["is_hot_day"].values
        times = work_df["time"].values
        tmaxs = work_df["temperature_2m_max"].values

        n = len(hot_mask)
        i = 0
        while i < n:
            if hot_mask[i]:
                start_idx = i
                while i < n and hot_mask[i]:
                    i += 1
                end_idx = i - 1
                duration = end_idx - start_idx + 1

                if duration >= min_consecutive_days:
                    run_tmax = tmaxs[start_idx:end_idx + 1]
                    peak_c = float(np.max(run_tmax))
                    mean_c = float(np.mean(run_tmax))
                    # Cumulative heat excess in degree-days: Sum(Tmax - Threshold)
                    intensity_c = float(np.sum(run_tmax - threshold_val_c))

                    # Classify severity
                    if duration >= 8 or peak_c >= p98_val_c:
                        severity = "Extreme"
                    elif duration >= 5:
                        severity = "Severe"
                    else:
                        severity = "Moderate"

                    start_date_str = pd.to_datetime(times[start_idx]).strftime("%Y-%m-%d")
                    end_date_str = pd.to_datetime(times[end_idx]).strftime("%Y-%m-%d")
                    event_year = int(pd.to_datetime(times[start_idx]).year)

                    # Convert to target units if Fahrenheit requested
                    if units == "fahrenheit":
                        peak_val = round(peak_c * 9.0 / 5.0 + 32.0, 1)
                        mean_val = round(mean_c * 9.0 / 5.0 + 32.0, 1)
                        intensity_val = round(intensity_c * 9.0 / 5.0, 1)
                    else:
                        peak_val = round(peak_c, 1)
                        mean_val = round(mean_c, 1)
                        intensity_val = round(intensity_c, 1)

                    events.append(HazardEvent(
                        event_id=f"hw_{event_year}_{str(uuid.uuid4())[:8]}",
                        year=event_year,
                        start_date=start_date_str,
                        end_date=end_date_str,
                        duration_days=int(duration),
                        peak_value=peak_val,
                        mean_value=mean_val,
                        intensity_score=intensity_val,
                        severity=severity
                    ))
            else:
                i += 1

        # Aggregate annual metrics
        work_df["year"] = work_df["time"].dt.year
        unique_years = sorted(work_df["year"].unique())
        annual_metrics: List[AnnualMetric] = []

        # Map events by year
        events_by_year: Dict[int, List[HazardEvent]] = {y: [] for y in unique_years}
        for ev in events:
            if ev.year in events_by_year:
                events_by_year[ev.year].append(ev)

        for y in unique_years:
            year_slice = work_df[work_df["year"] == y]
            evs = events_by_year.get(y, [])

            event_count = len(evs)
            total_hazard_days = sum(ev.duration_days for ev in evs)
            max_duration = max((ev.duration_days for ev in evs), default=0)
            mean_intensity = float(np.mean([ev.intensity_score for ev in evs])) if evs else 0.0

            ann_max_c = float(year_slice["temperature_2m_max"].max()) if not year_slice.empty else 0.0
            ann_mean_c = float(year_slice["temperature_2m_mean"].mean()) if not year_slice.empty else 0.0

            if units == "fahrenheit":
                ann_max = round(ann_max_c * 9.0 / 5.0 + 32.0, 1)
                ann_mean = round(ann_mean_c * 9.0 / 5.0 + 32.0, 1)
            else:
                ann_max = round(ann_max_c, 1)
                ann_mean = round(ann_mean_c, 1)

            annual_metrics.append(AnnualMetric(
                year=int(y),
                event_count=event_count,
                total_hazard_days=total_hazard_days,
                max_duration_days=max_duration,
                mean_intensity=round(mean_intensity, 1),
                annual_max_temp=ann_max,
                annual_mean_temp=ann_mean
            ))

        # Calculate 5-year rolling averages for frequency and days
        if len(annual_metrics) >= 5:
            counts = [m.event_count for m in annual_metrics]
            days = [m.total_hazard_days for m in annual_metrics]
            s_counts = pd.Series(counts)
            s_days = pd.Series(days)
            rolling_c = s_counts.rolling(window=5, min_periods=1, center=True).mean().round(2).tolist()
            rolling_d = s_days.rolling(window=5, min_periods=1, center=True).mean().round(2).tolist()
            for idx, metric in enumerate(annual_metrics):
                metric.rolling_5y_count = rolling_c[idx]
                metric.rolling_5y_days = rolling_d[idx]

        # Convert threshold and peak to requested units
        final_threshold = round(threshold_val_c * 9.0 / 5.0 + 32.0, 1) if units == "fahrenheit" else round(threshold_val_c, 1)
        final_peak = round(all_time_peak_c * 9.0 / 5.0 + 32.0, 1) if units == "fahrenheit" else round(all_time_peak_c, 1)

        return events, annual_metrics, final_threshold, final_peak

    @staticmethod
    def detect_drought_dry_spells(
        df: pd.DataFrame,
        min_consecutive_days: int = 14,
        dry_day_threshold_mm: float = 1.0
    ) -> Tuple[List[HazardEvent], List[AnnualMetric], float, float]:
        """
        Detect meteorological dry spells: consecutive days with precipitation < threshold.
        """
        if df.empty or "precipitation_sum" not in df.columns:
            return [], [], 0.0, 0.0

        work_df = df.copy().sort_values("time").reset_index(drop=True)
        work_df["is_dry_day"] = work_df["precipitation_sum"] < dry_day_threshold_mm

        events: List[HazardEvent] = []
        dry_mask = work_df["is_dry_day"].values
        times = work_df["time"].values
        precips = work_df["precipitation_sum"].values

        n = len(dry_mask)
        i = 0
        while i < n:
            if dry_mask[i]:
                start_idx = i
                while i < n and dry_mask[i]:
                    i += 1
                end_idx = i - 1
                duration = end_idx - start_idx + 1

                if duration >= min_consecutive_days:
                    total_precip = float(np.sum(precips[start_idx:end_idx + 1]))
                    severity = "Extreme" if duration >= 30 else ("Severe" if duration >= 21 else "Moderate")
                    start_date_str = pd.to_datetime(times[start_idx]).strftime("%Y-%m-%d")
                    end_date_str = pd.to_datetime(times[end_idx]).strftime("%Y-%m-%d")
                    event_year = int(pd.to_datetime(times[start_idx]).year)

                    events.append(HazardEvent(
                        event_id=f"dr_{event_year}_{str(uuid.uuid4())[:8]}",
                        year=event_year,
                        start_date=start_date_str,
                        end_date=end_date_str,
                        duration_days=int(duration),
                        peak_value=round(float(duration), 1),
                        mean_value=round(total_precip, 2),
                        intensity_score=round(float(duration), 1),
                        severity=severity
                    ))
            else:
                i += 1

        work_df["year"] = work_df["time"].dt.year
        unique_years = sorted(work_df["year"].unique())
        events_by_year: Dict[int, List[HazardEvent]] = {y: [] for y in unique_years}
        for ev in events:
            if ev.year in events_by_year:
                events_by_year[ev.year].append(ev)

        annual_metrics: List[AnnualMetric] = []
        for y in unique_years:
            evs = events_by_year.get(y, [])
            annual_metrics.append(AnnualMetric(
                year=int(y),
                event_count=len(evs),
                total_hazard_days=sum(e.duration_days for e in evs),
                max_duration_days=max((e.duration_days for e in evs), default=0),
                mean_intensity=round(float(np.mean([e.duration_days for e in evs])), 1) if evs else 0.0,
                annual_max_temp=0.0,
                annual_mean_temp=0.0
            ))

        longest_spell = max((e.duration_days for e in events), default=0)
        return events, annual_metrics, dry_day_threshold_mm, float(longest_spell)

    @staticmethod
    def detect_heavy_rainfall(
        df: pd.DataFrame,
        percentile_threshold: float = 95.0,
        min_consecutive_days: int = 1
    ) -> Tuple[List[HazardEvent], List[AnnualMetric], float, float]:
        """
        Detect extreme precipitation events: daily precipitation >= 95th percentile of wet days.
        """
        if df.empty or "precipitation_sum" not in df.columns:
            return [], [], 0.0, 0.0

        work_df = df.copy().sort_values("time").reset_index(drop=True)
        wet_days = work_df[work_df["precipitation_sum"] >= 1.0]["precipitation_sum"]
        if wet_days.empty:
            threshold_val = 25.0
        else:
            threshold_val = float(np.percentile(wet_days, percentile_threshold))

        work_df["is_extreme_rain"] = work_df["precipitation_sum"] >= threshold_val

        events: List[HazardEvent] = []
        rain_mask = work_df["is_extreme_rain"].values
        times = work_df["time"].values
        precips = work_df["precipitation_sum"].values

        n = len(rain_mask)
        i = 0
        while i < n:
            if rain_mask[i]:
                start_idx = i
                while i < n and rain_mask[i]:
                    i += 1
                end_idx = i - 1
                duration = end_idx - start_idx + 1

                if duration >= min_consecutive_days:
                    run_precip = precips[start_idx:end_idx + 1]
                    peak_rain = float(np.max(run_precip))
                    total_rain = float(np.sum(run_precip))
                    severity = "Extreme" if peak_rain >= threshold_val * 2 else ("Severe" if duration >= 2 else "Moderate")
                    start_date_str = pd.to_datetime(times[start_idx]).strftime("%Y-%m-%d")
                    end_date_str = pd.to_datetime(times[end_idx]).strftime("%Y-%m-%d")
                    event_year = int(pd.to_datetime(times[start_idx]).year)

                    events.append(HazardEvent(
                        event_id=f"rain_{event_year}_{str(uuid.uuid4())[:8]}",
                        year=event_year,
                        start_date=start_date_str,
                        end_date=end_date_str,
                        duration_days=int(duration),
                        peak_value=round(peak_rain, 1),
                        mean_value=round(float(np.mean(run_precip)), 1),
                        intensity_score=round(total_rain, 1),
                        severity=severity
                    ))
            else:
                i += 1

        work_df["year"] = work_df["time"].dt.year
        unique_years = sorted(work_df["year"].unique())
        events_by_year: Dict[int, List[HazardEvent]] = {y: [] for y in unique_years}
        for ev in events:
            if ev.year in events_by_year:
                events_by_year[ev.year].append(ev)

        annual_metrics: List[AnnualMetric] = []
        for y in unique_years:
            evs = events_by_year.get(y, [])
            annual_metrics.append(AnnualMetric(
                year=int(y),
                event_count=len(evs),
                total_hazard_days=sum(e.duration_days for e in evs),
                max_duration_days=max((e.duration_days for e in evs), default=0),
                mean_intensity=round(float(np.mean([e.intensity_score for e in evs])), 1) if evs else 0.0,
                annual_max_temp=0.0,
                annual_mean_temp=0.0
            ))

        max_daily_rain = float(work_df["precipitation_sum"].max())
        return events, annual_metrics, round(threshold_val, 1), round(max_daily_rain, 1)


hazard_detector = ClimateHazardDetector()
