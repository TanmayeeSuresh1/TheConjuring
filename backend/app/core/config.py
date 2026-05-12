"""Application configuration using Pydantic Settings."""

from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    APP_VERSION: str = "1.0.0"
    APP_NAME: str = "SafeShare AI"
    DEBUG: bool = False
    ENVIRONMENT: str = "production"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://safeshare:safeshare_pass@localhost:5432/safeshare_db"
    DATABASE_POOL_SIZE: int = 20
    DATABASE_MAX_OVERFLOW: int = 10

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_CACHE_TTL: int = 3600

    # Celery
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    # JWT
    SECRET_KEY: str = "change-this-in-production-use-256-bit-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "https://safeshare.ai"]

    # AI Models
    NLP_MODEL: str = "en_core_web_trf"
    TRANSFORMER_MODEL: str = "distilbert-base-uncased"
    ANOMALY_CONTAMINATION: float = 0.1
    RISK_THRESHOLD_HIGH: float = 0.75
    RISK_THRESHOLD_MEDIUM: float = 0.45

    # OCR
    TESSERACT_CMD: str = "/usr/bin/tesseract"
    OCR_LANGUAGES: List[str] = ["en"]
    MAX_IMAGE_SIZE_MB: int = 10

    # File Upload
    MAX_UPLOAD_SIZE_MB: int = 50
    ALLOWED_IMAGE_TYPES: List[str] = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    ALLOWED_DOC_TYPES: List[str] = ["application/pdf", "text/plain"]

    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    RATE_LIMIT_SCAN_PER_MINUTE: int = 20

    # Threat Intelligence
    VIRUSTOTAL_API_KEY: str = ""
    SHODAN_API_KEY: str = ""

    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"


settings = Settings()
