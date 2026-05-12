"""
Async Celery scan tasks — runs AI pipeline stages in background workers.
"""

import json
import time

import structlog

from app.celery_workers.celery_app import celery_app
from app.ai_engine.pii_detector import PIIDetector
from app.nlp_services.nlp_pipeline import NLPPipeline
from app.anomaly_detection.isolation_forest import AnomalyDetector
from app.risk_engine.risk_scorer import RiskScorer
from app.threat_intelligence.url_analyzer import URLAnalyzer
from app.ocr_pipeline.ocr_engine import OCREngine

logger = structlog.get_logger(__name__)

# Module-level singletons (reused across tasks in same worker process)
_pii = PIIDetector()
_nlp = NLPPipeline()
_anomaly = AnomalyDetector()
_risk = RiskScorer()
_url = URLAnalyzer()
_ocr = OCREngine()


@celery_app.task(bind=True, name="app.celery_workers.scan_tasks.scan_text_task", max_retries=2)
def scan_text_task(self, scan_id: str, text: str) -> dict:
    """Full AI pipeline for text content scanning."""
    logger.info("scan_text_task_started", scan_id=scan_id)
    try:
        pii_result = _pii.detect(text)
        nlp_result = _nlp.analyze(text)
        anomaly_result = _anomaly.score(
            text,
            pii_count=pii_result.total_matches,
            credential_count=sum(
                1 for d in pii_result.detections if d.category == "credential"
            ),
        )
        risk_result = _risk.aggregate(
            pii_result=pii_result,
            nlp_result=nlp_result,
            anomaly_result=anomaly_result,
        )

        return {
            "scan_id": scan_id,
            "status": "completed",
            "pii": pii_result.to_dict(),
            "nlp": nlp_result.to_dict(),
            "anomaly": anomaly_result.to_dict(),
            "risk": risk_result.to_dict(),
        }
    except Exception as exc:
        logger.error("scan_text_task_failed", scan_id=scan_id, error=str(exc))
        raise self.retry(exc=exc, countdown=5)


@celery_app.task(bind=True, name="app.celery_workers.scan_tasks.scan_image_task", max_retries=2)
def scan_image_task(self, scan_id: str, image_bytes_hex: str) -> dict:
    """OCR + PII pipeline for image/screenshot scanning."""
    logger.info("scan_image_task_started", scan_id=scan_id)
    try:
        image_bytes = bytes.fromhex(image_bytes_hex)
        ocr_result = _ocr.process_image_bytes(image_bytes)

        pii_result = None
        nlp_result = None
        anomaly_result = None

        if ocr_result.extracted_text:
            pii_result = _pii.detect(ocr_result.extracted_text)
            nlp_result = _nlp.analyze(ocr_result.extracted_text)
            anomaly_result = _anomaly.score(
                ocr_result.extracted_text,
                pii_count=pii_result.total_matches if pii_result else 0,
            )

        risk_result = _risk.aggregate(
            pii_result=pii_result,
            nlp_result=nlp_result,
            anomaly_result=anomaly_result,
            ocr_result=ocr_result,
        )

        return {
            "scan_id": scan_id,
            "status": "completed",
            "ocr": ocr_result.to_dict(),
            "pii": pii_result.to_dict() if pii_result else {},
            "nlp": nlp_result.to_dict() if nlp_result else {},
            "anomaly": anomaly_result.to_dict() if anomaly_result else {},
            "risk": risk_result.to_dict(),
        }
    except Exception as exc:
        logger.error("scan_image_task_failed", scan_id=scan_id, error=str(exc))
        raise self.retry(exc=exc, countdown=5)


@celery_app.task(bind=True, name="app.celery_workers.scan_tasks.scan_url_task", max_retries=2)
def scan_url_task(self, scan_id: str, url: str) -> dict:
    """URL phishing and threat analysis pipeline."""
    logger.info("scan_url_task_started", scan_id=scan_id)
    try:
        url_result = _url.analyze(url)
        risk_result = _risk.aggregate(url_result=url_result)

        return {
            "scan_id": scan_id,
            "status": "completed",
            "url_analysis": url_result.to_dict(),
            "risk": risk_result.to_dict(),
        }
    except Exception as exc:
        logger.error("scan_url_task_failed", scan_id=scan_id, error=str(exc))
        raise self.retry(exc=exc, countdown=5)
