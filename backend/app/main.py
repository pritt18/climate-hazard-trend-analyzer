import time
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.api.routes import router
from app.models.database import db_cache

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("climate_app.main")

# Rate Limiter
limiter = Limiter(key_func=get_remote_address, default_limits=[settings.RATE_LIMIT_PER_MINUTE])


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for clean database startup and shutdown."""
    logger.info("Initializing %s v%s...", settings.APP_NAME, settings.APP_VERSION)
    await db_cache.connect()
    yield
    logger.info("Shutting down %s...", settings.APP_NAME)
    await db_cache.disconnect()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Geospatial climate hazard intelligence and historical trend analysis platform.",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Attach rate limiter state and exception handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    """Measure request processing duration and attach execution header."""
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = f"{process_time:.4f}s"
    return response


# Include API routes
app.include_router(router)


@app.get("/", tags=["Root"])
async def root():
    """Root entrypoint with service metadata and documentation links."""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "healthy",
        "documentation": "/docs",
        "endpoints": {
            "health": "/api/health",
            "presets": "/api/presets",
            "locations_search": "/api/locations/search",
            "analyze": "/api/analyze",
            "export_csv": "/api/export/csv",
            "export_pdf": "/api/export/pdf"
        }
    }
