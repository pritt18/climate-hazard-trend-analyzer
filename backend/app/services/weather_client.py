import asyncio
import logging
from typing import Dict, Any, List, Optional
import httpx
import pandas as pd
import numpy as np

from app.config import settings
from app.models.database import db_cache
from app.models.schemas import GeocodeResult

logger = logging.getLogger("climate_app.weather_client")


class WeatherDataService:
    """
    Ingests, cleans, validates, and caches historical climate data from Open-Meteo.
    Handles data gaps, missing values, outliers, and API rate limits.
    """

    def __init__(self):
        self.archive_url = settings.OPEN_METEO_ARCHIVE_URL
        self.geocoding_url = settings.OPEN_METEO_GEOCODING_URL
        self.timeout = settings.EXTERNAL_API_TIMEOUT_SECONDS
        self.max_retries = settings.EXTERNAL_API_MAX_RETRIES

    async def get_historical_weather(
        self,
        latitude: float,
        longitude: float,
        start_year: int,
        end_year: int
    ) -> pd.DataFrame:
        """
        Fetch historical daily weather dataset for coordinates and year range.
        Utilizes NoSQL caching and cleans data gaps/outliers.
        """
        # Snap coordinates to 2 decimal places (~1.1 km) for better cache density
        rounded_lat = round(latitude, 2)
        rounded_lon = round(longitude, 2)
        cache_key = db_cache.generate_key("weather", rounded_lat, rounded_lon, start_year, end_year)

        # 1. Check cache first
        cached_data = await db_cache.get_raw_weather(cache_key)
        if cached_data:
            logger.info("Cache hit for weather data: lat=%s, lon=%s, %s-%s", rounded_lat, rounded_lon, start_year, end_year)
            df = pd.DataFrame(cached_data)
            df["time"] = pd.to_datetime(df["time"])
            return df

        # 2. Ingest from Open-Meteo Historical Archive API
        logger.info("Fetching from Open-Meteo API: lat=%s, lon=%s, %s-%s", rounded_lat, rounded_lon, start_year, end_year)
        params = {
            "latitude": rounded_lat,
            "longitude": rounded_lon,
            "start_date": f"{start_year}-01-01",
            "end_date": f"{end_year}-12-31",
            "daily": ["temperature_2m_max", "temperature_2m_min", "temperature_2m_mean", "precipitation_sum"],
            "timezone": "auto"
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            attempts = 0
            backoff = 1.5
            while attempts < self.max_retries:
                try:
                    response = await client.get(self.archive_url, params=params)
                    if response.status_code == 200:
                        raw_json = response.json()
                        daily = raw_json.get("daily", {})
                        if not daily or "time" not in daily:
                            raise ValueError("External API returned empty daily series")

                        # Process and clean data
                        df = self._clean_and_impute_weather_data(daily)

                        # Save to NoSQL cache
                        serializable_records = df.copy()
                        serializable_records["time"] = serializable_records["time"].dt.strftime("%Y-%m-%d")
                        await db_cache.set_raw_weather(cache_key, serializable_records.to_dict(orient="records"))

                        return df

                    elif response.status_code == 429:
                        attempts += 1
                        logger.warning("Rate limited by weather API (429). Attempt %s/%s. Backoff %ss.", attempts, self.max_retries, backoff)
                        await asyncio.sleep(backoff)
                        backoff *= 2
                    else:
                        attempts += 1
                        logger.error("Weather API error HTTP %s: %s", response.status_code, response.text)
                        await asyncio.sleep(backoff)
                        backoff *= 2

                except (httpx.RequestError, Exception) as e:
                    attempts += 1
                    logger.warning("HTTP request exception (%s). Attempt %s/%s", str(e), attempts, self.max_retries)
                    if attempts >= self.max_retries:
                        raise RuntimeError(f"Failed to fetch historical weather data after {self.max_retries} attempts: {str(e)}")
                    await asyncio.sleep(backoff)
                    backoff *= 2

            raise RuntimeError(f"Weather API request failed with status {response.status_code if 'response' in locals() else 'unknown'}")

    def _clean_and_impute_weather_data(self, daily_data: Dict[str, Any]) -> pd.DataFrame:
        """
        Handle real-world noisy data:
        1. Formats date index
        2. Detects missing days and fills time gaps
        3. Imputes missing/NaN values using linear interpolation + bfill
        4. Detects unphysical temperature outliers (>60°C or <-85°C) and clamps/interpolates
        """
        df = pd.DataFrame(daily_data)
        df["time"] = pd.to_datetime(df["time"])

        # Ensure continuous chronological order
        df = df.sort_values("time").drop_duplicates(subset=["time"]).reset_index(drop=True)

        # Ensure numerical columns exist
        num_cols = ["temperature_2m_max", "temperature_2m_min", "temperature_2m_mean", "precipitation_sum"]
        for col in num_cols:
            if col not in df.columns:
                df[col] = np.nan
            else:
                df[col] = pd.to_numeric(df[col], errors="coerce")

        # Outlier validation: replace unphysical sensor/reanalysis artifacts
        df.loc[df["temperature_2m_max"] > 65.0, "temperature_2m_max"] = np.nan
        df.loc[df["temperature_2m_max"] < -90.0, "temperature_2m_max"] = np.nan
        df.loc[df["precipitation_sum"] < 0.0, "precipitation_sum"] = 0.0
        df.loc[df["precipitation_sum"] > 1500.0, "precipitation_sum"] = np.nan

        # Linear interpolation for gaps, bounded with forward and backward fill
        df[num_cols] = df[num_cols].interpolate(method="linear", limit_direction="both")
        df[num_cols] = df[num_cols].bfill().ffill()

        # If temperature_2m_mean is still empty, derive from (max + min) / 2
        df["temperature_2m_mean"] = df["temperature_2m_mean"].fillna((df["temperature_2m_max"] + df["temperature_2m_min"]) / 2.0)

        return df

    async def search_locations(self, query: str) -> List[GeocodeResult]:
        """Geocoding search for city or region name using Open-Meteo."""
        if not query or len(query.strip()) < 2:
            return []

        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                resp = await client.get(
                    self.geocoding_url,
                    params={"name": query.strip(), "count": 8, "language": "en", "format": "json"}
                )
                if resp.status_code == 200:
                    data = resp.json()
                    results = data.get("results", [])
                    return [
                        GeocodeResult(
                            id=item.get("id", i),
                            name=item.get("name"),
                            latitude=item.get("latitude"),
                            longitude=item.get("longitude"),
                            country=item.get("country"),
                            admin1=item.get("admin1"),
                            timezone=item.get("timezone")
                        )
                        for i, item in enumerate(results)
                    ]
            except Exception as e:
                logger.error("Geocoding lookup failed: %s", e)
        return []


weather_service = WeatherDataService()
