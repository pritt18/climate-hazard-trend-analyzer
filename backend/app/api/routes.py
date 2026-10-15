import logging
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, Query, Response, Request
from fastapi.responses import StreamingResponse
import io

from app.models.schemas import (
    AnalysisRequest,
    AnalysisResponse,
    GeocodeResult
)
from app.models.database import db_cache
from app.services.weather_client import weather_service
from app.services.hazard_detector import hazard_detector
from app.services.trend_analyzer import trend_analyzer
from app.services.report_generator import report_generator
from app.config import settings

logger = logging.getLogger("climate_app.api")
router = APIRouter(prefix="/api", tags=["Climate Hazard Analytics"])

PRESET_LOCATIONS = [
    {"name": "Phoenix, Arizona, USA", "latitude": 33.45, "longitude": -112.07, "climate_zone": "Hot Desert (BWh)"},
    {"name": "New Delhi, India", "latitude": 28.61, "longitude": 77.21, "climate_zone": "Subtropical (Cwa)"},
    {"name": "Madrid, Spain", "latitude": 40.42, "longitude": -3.70, "climate_zone": "Mediterranean (Csa)"},
    {"name": "Tokyo, Japan", "latitude": 35.68, "longitude": 139.69, "climate_zone": "Humid Subtropical (Cfa)"},
    {"name": "Sydney, Australia", "latitude": -33.87, "longitude": 151.21, "climate_zone": "Temperate Oceanic (Cfb)"},
    {"name": "London, United Kingdom", "latitude": 51.51, "longitude": -0.13, "climate_zone": "Marine West Coast (Cfb)"},
    {"name": "Chicago, Illinois, USA", "latitude": 41.88, "longitude": -87.63, "climate_zone": "Humid Continental (Dfa)"},
    {"name": "Cairo, Egypt", "latitude": 30.04, "longitude": 31.24, "climate_zone": "Hot Desert (BWh)"},
    {"name": "São Paulo, Brazil", "latitude": -23.55, "longitude": -46.63, "climate_zone": "Humid Subtropical (Cfa)"},
    {"name": "Nairobi, Kenya", "latitude": -1.29, "longitude": 36.82, "climate_zone": "Subtropical Highland (Cwb)"}
]


@router.get("/health")
async def health_check():
    """System health check and database status."""
    return {
        "status": "online",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "mongodb_connected": db_cache.is_mongo_connected,
        "environment": settings.ENVIRONMENT
    }


@router.get("/presets")
async def get_presets():
    """Retrieve preconfigured cities for quick geographic analysis."""
    return {"presets": PRESET_LOCATIONS}


@router.get("/locations/search", response_model=List[GeocodeResult])
async def search_locations(q: str = Query(..., min_length=2, description="City or region name")):
    """Geocoding autocomplete search for locations."""
    try:
        return await weather_service.search_locations(q)
    except Exception as e:
        logger.error("Location search failed: %s", e)
        raise HTTPException(status_code=500, detail="Geocoding lookup encountered an error")


async def _perform_hazard_analysis(request: AnalysisRequest) -> AnalysisResponse:
    """Internal business logic pipeline to compute or retrieve analysis."""
    rounded_lat = round(request.latitude, 2)
    rounded_lon = round(request.longitude, 2)

    cache_key = db_cache.generate_key(
        "analysis",
        rounded_lat,
        rounded_lon,
        request.hazard_type,
        request.start_year,
        request.end_year,
        request.percentile_threshold,
        request.min_duration_days,
        request.units
    )

    # 1. Check NoSQL analysis cache
    cached_payload = await db_cache.get_analysis(cache_key)
    if cached_payload:
        logger.info("Serving analysis from cache for lat=%s, lon=%s", rounded_lat, rounded_lon)
        resp = AnalysisResponse(**cached_payload)
        resp.cached = True
        return resp

    # 2. Ingest historical weather timeseries
    try:
        df = await weather_service.get_historical_weather(
            latitude=rounded_lat,
            longitude=rounded_lon,
            start_year=request.start_year,
            end_year=request.end_year
        )
    except Exception as e:
        logger.error("Weather data fetch error: %s", e)
        raise HTTPException(
            status_code=502,
            detail=f"Unable to retrieve historical climate data from Open-Meteo: {str(e)}"
        )

    # 3. Apply Climate Hazard Detection
    if request.hazard_type == "heatwave":
        events, annual_metrics, threshold_val, all_time_peak = hazard_detector.detect_heatwaves(
            df=df,
            percentile_threshold=request.percentile_threshold,
            min_consecutive_days=request.min_duration_days,
            units=request.units
        )
    elif request.hazard_type == "drought":
        events, annual_metrics, threshold_val, all_time_peak = hazard_detector.detect_drought_dry_spells(
            df=df,
            min_consecutive_days=14,
            dry_day_threshold_mm=1.0
        )
    elif request.hazard_type == "heavy_rainfall":
        events, annual_metrics, threshold_val, all_time_peak = hazard_detector.detect_heavy_rainfall(
            df=df,
            percentile_threshold=request.percentile_threshold,
            min_consecutive_days=1
        )
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported hazard type '{request.hazard_type}'")

    # 4. Statistical Trend Analysis (Linear Regression & Mann-Kendall)
    trend_stats, summary = trend_analyzer.analyze_trends(
        metrics=annual_metrics,
        events=events,
        start_year=request.start_year,
        end_year=request.end_year,
        hazard_type=request.hazard_type,
        threshold_val=threshold_val,
        all_time_peak=all_time_peak,
        units=request.units
    )

    location_display = request.location_name or f"Coordinates ({rounded_lat:.2f}°, {rounded_lon:.2f}°)"

    response_data = AnalysisResponse(
        location_name=location_display,
        latitude=rounded_lat,
        longitude=rounded_lon,
        hazard_type=request.hazard_type,
        start_year=request.start_year,
        end_year=request.end_year,
        percentile_threshold=request.percentile_threshold,
        threshold_value=threshold_val,
        units=request.units,
        summary=summary,
        trend=trend_stats,
        annual_metrics=annual_metrics,
        events=events,
        cached=False
    )

    # 5. Persist into NoSQL database cache
    await db_cache.set_analysis(cache_key, response_data.model_dump())

    return response_data


@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_hazard(request: AnalysisRequest):
    """
    Main endpoint: Computes climate hazard detection, annual aggregation,
    and statistical trends for a given region and time range.
    """
    return await _perform_hazard_analysis(request)


@router.post("/export/csv")
async def export_csv(request: AnalysisRequest):
    """Generate and download a detailed CSV report."""
    analysis = await _perform_hazard_analysis(request)
    csv_content = report_generator.generate_csv(analysis)

    filename = f"climate_hazard_{analysis.hazard_type}_{analysis.start_year}_{analysis.end_year}.csv"
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.post("/export/pdf")
async def export_pdf(request: AnalysisRequest):
    """Generate and download a PDF summary assessment report."""
    analysis = await _perform_hazard_analysis(request)
    pdf_bytes = report_generator.generate_pdf(analysis)

    filename = f"climate_hazard_report_{analysis.hazard_type}_{analysis.start_year}_{analysis.end_year}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
