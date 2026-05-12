"""
SafeShare AI - FastAPI Backend Entry Point
Enterprise AI-powered Data Loss Prevention Platform
"""

import time
import uuid
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from starlette.responses import Response

from app.api.routes import scan, threats, dashboard, admin, policies, auth
from app.core.config import settings
from app.core.database import init_db
from app.core.redis_client import init_redis

logger = structlog.get_logger(__name__)

# Prometheus metrics
REQUEST_COUNT = Counter("safeshare_requests_total", "Total requests", ["method", "endpoint", "status"])
REQUEST_LATENCY = Histogram("safeshare_request_duration_seconds", "Request latency", ["endpoint"])
SCAN_COUNT = Counter("safeshare_scans_total", "Total scans", ["scan_type", "risk_level"])


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan - startup and shutdown."""
    logger.info("SafeShare AI starting up", version=settings.APP_VERSION)
    await init_db()
    await init_redis()
    logger.info("All services initialized successfully")
    yield
    logger.info("SafeShare AI shutting down")


app = FastAPI(
    title="SafeShare AI",
    description="Enterprise AI-powered Data Loss Prevention & Communication Security Platform",
    version=settings.APP_VERSION,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

# Middleware
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_middleware(request: Request, call_next):
    """Request ID injection, logging, and metrics."""
    request_id = str(uuid.uuid4())
    start_time = time.time()

    request.state.request_id = request_id

    with structlog.contextvars.bound_contextvars(
        request_id=request_id,
        method=request.method,
        path=request.url.path,
    ):
        response = await call_next(request)
        duration = time.time() - start_time

        REQUEST_COUNT.labels(
            method=request.method,
            endpoint=request.url.path,
            status=response.status_code,
        ).inc()
        REQUEST_LATENCY.labels(endpoint=request.url.path).observe(duration)

        response.headers["X-Request-ID"] = request_id
        response.headers["X-Response-Time"] = f"{duration:.4f}s"

        logger.info(
            "request_completed",
            status_code=response.status_code,
            duration_ms=round(duration * 1000, 2),
        )
        return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("unhandled_exception", error=str(exc), path=request.url.path)
    return JSONResponse(
        status_code=500,
        content={
            "error": "internal_server_error",
            "message": "An unexpected error occurred",
            "request_id": getattr(request.state, "request_id", None),
        },
    )


# API Routes
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(scan.router, prefix="/api/scan", tags=["Scan Engine"])
app.include_router(threats.router, prefix="/api/threats", tags=["Threat Intelligence"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(policies.router, prefix="/api/policies", tags=["Policies"])


@app.get("/api/health")
async def health_check():
    return {
        "status": "operational",
        "version": settings.APP_VERSION,
        "service": "SafeShare AI",
        "timestamp": time.time(),
    }


@app.get("/metrics")
async def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)
