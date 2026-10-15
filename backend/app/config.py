import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration and environment settings."""

    APP_NAME: str = "Climate Hazard Trend Analyzer"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Server settings
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ]

    # Database settings (MongoDB with resilient in-memory fallback)
    MONGODB_URI: str = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    MONGODB_DB_NAME: str = "climate_hazard_db"
    CACHE_TTL_DAYS: int = 30

    # External APIs
    OPEN_METEO_ARCHIVE_URL: str = "https://archive-api.open-meteo.com/v1/archive"
    OPEN_METEO_GEOCODING_URL: str = "https://geocoding-api.open-meteo.com/v1/search"
    EXTERNAL_API_TIMEOUT_SECONDS: float = 45.0
    EXTERNAL_API_MAX_RETRIES: int = 3

    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: str = "60/minute"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="allow"
    )


settings = Settings()
