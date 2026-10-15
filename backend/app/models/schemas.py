from typing import List, Optional, Literal
from pydantic import BaseModel, Field, field_validator
from datetime import datetime


class AnalysisRequest(BaseModel):
    """Payload for climate hazard analysis query."""
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Latitude between -90 and 90")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Longitude between -180 and 180")
    location_name: Optional[str] = Field(None, max_length=100, description="Human-readable city/region name")
    hazard_type: Literal["heatwave", "drought", "heavy_rainfall"] = Field(
        default="heatwave",
        description="Hazard type to analyze. Defaults to heatwave."
    )
    start_year: int = Field(default=1990, ge=1940, le=2024, description="Start year (1940-2024)")
    end_year: int = Field(default=2023, ge=1940, le=2024, description="End year (1940-2024)")
    percentile_threshold: float = Field(
        default=95.0,
        ge=75.0,
        le=99.9,
        description="Percentile threshold for hazard detection (e.g. 95th percentile)"
    )
    min_duration_days: int = Field(
        default=3,
        ge=1,
        le=30,
        description="Minimum consecutive days to qualify as an event"
    )
    units: Literal["celsius", "fahrenheit"] = Field(
        default="celsius",
        description="Temperature units display"
    )

    @field_validator("end_year")
    @classmethod
    def validate_year_range(cls, v: int, info):
        start_year = info.data.get("start_year")
        if start_year is not None and v < start_year:
            raise ValueError(f"end_year ({v}) must be greater than or equal to start_year ({start_year})")
        if start_year is not None and (v - start_year) < 4:
            raise ValueError("Time range must span at least 5 years for meaningful trend analysis")
        return v


class HazardEvent(BaseModel):
    """Detailed record of an individual detected climate hazard event."""
    event_id: str
    year: int
    start_date: str
    end_date: str
    duration_days: int
    peak_value: float
    mean_value: float
    intensity_score: float  # Cumulative excess above threshold
    severity: Literal["Moderate", "Severe", "Extreme"]


class AnnualMetric(BaseModel):
    """Aggregated annual indicator for time series trends."""
    year: int
    event_count: int
    total_hazard_days: int
    max_duration_days: int
    mean_intensity: float
    annual_max_temp: float
    annual_mean_temp: float
    rolling_5y_count: Optional[float] = None
    rolling_5y_days: Optional[float] = None


class TrendStatistics(BaseModel):
    """Rigorous statistical trend indicators: Linear Regression & Mann-Kendall Test."""
    # Linear regression
    linear_slope_per_decade: float
    linear_slope_per_year: float
    linear_intercept: float
    r_squared: float
    linear_p_value: float

    # Mann-Kendall non-parametric monotonic trend test
    mann_kendall_s: float
    mann_kendall_var_s: float
    mann_kendall_z: float
    mann_kendall_p: float
    kendall_tau: float
    sens_slope: float

    # Qualitative verdict
    trend_direction: Literal["Increasing", "Decreasing", "No Significant Trend"]
    is_statistically_significant: bool  # True if p < 0.05
    percent_change_since_baseline: float
    baseline_period_label: str
    recent_period_label: str
    baseline_annual_mean: float
    recent_annual_mean: float


class HazardSummary(BaseModel):
    """High-level executive takeaways and key climate indicators."""
    headline: str
    subheadline: str
    total_events: int
    total_hazard_days: int
    average_duration_days: float
    all_time_peak_value: float
    threshold_value: float
    longest_event: Optional[HazardEvent] = None


class AnalysisResponse(BaseModel):
    """Comprehensive analysis response payload."""
    location_name: str
    latitude: float
    longitude: float
    hazard_type: str
    start_year: int
    end_year: int
    percentile_threshold: float
    threshold_value: float
    units: str
    summary: HazardSummary
    trend: TrendStatistics
    annual_metrics: List[AnnualMetric]
    events: List[HazardEvent]
    cached: bool = False
    data_source: str = "Open-Meteo ERA5 Reanalysis Archive"
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class GeocodeResult(BaseModel):
    """Geocoding search result for region selection."""
    id: int
    name: str
    latitude: float
    longitude: float
    country: Optional[str] = None
    admin1: Optional[str] = None  # State / Province
    timezone: Optional[str] = None
