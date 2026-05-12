"""Celery application and async scan task definitions."""

from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "safeshare_ai",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.celery_workers.scan_tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_routes={
        "app.celery_workers.scan_tasks.scan_text_task": {"queue": "text_scans"},
        "app.celery_workers.scan_tasks.scan_image_task": {"queue": "image_scans"},
        "app.celery_workers.scan_tasks.scan_url_task": {"queue": "url_scans"},
    },
)
