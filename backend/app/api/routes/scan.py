"""Scan API routes - text, image, URL, and live WebSocket scanning. Auth removed."""
import hashlib, json, time, uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, File, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from app.core.config import settings
from app.ai_engine.pii_detector import PIIDetector
from app.nlp_services.nlp_pipeline import NLPPipeline
from app.anomaly_detection.isolation_forest import AnomalyDetector
from app.risk_engine.risk_scorer import RiskScorer
from app.threat_intelligence.url_analyzer import URLAnalyzer
from app.ocr_pipeline.ocr_engine import OCREngine

router = APIRouter()
_pii = PIIDetector()
_nlp = NLPPipeline()
_anomaly = AnomalyDetector()
_risk = RiskScorer()
_url = URLAnalyzer()
_ocr = OCREngine()


class TextScanRequest(BaseModel):
    text: str
    context: Optional[str] = None


class URLScanRequest(BaseModel):
    url: str


def _resp(scan_id, scan_type, result):
    return {"scan_id": scan_id, "scan_type": scan_type, "status": "completed",
            "timestamp": datetime.now(timezone.utc).isoformat(), **result}


@router.post("/text")
async def scan_text(body: TextScanRequest):
    if len(body.text) > 50000:
        raise HTTPException(status_code=413, detail="Text exceeds 50,000 character limit")
    scan_id = str(uuid.uuid4())
    start = time.perf_counter()
    pii_result = _pii.detect(body.text)
    nlp_result = _nlp.analyze(body.text)
    anomaly_result = _anomaly.score(
        body.text,
        pii_count=pii_result.total_matches,
        credential_count=sum(1 for d in pii_result.detections if d.category == "credential"),
    )
    risk_result = _risk.aggregate(pii_result=pii_result, nlp_result=nlp_result, anomaly_result=anomaly_result)
    duration_ms = int((time.perf_counter() - start) * 1000)
    return _resp(scan_id, "text", {
        "pii": pii_result.to_dict(), "nlp": nlp_result.to_dict(),
        "anomaly": anomaly_result.to_dict(), "risk": risk_result.to_dict(),
        "duration_ms": duration_ms,
    })


@router.post("/image")
async def scan_image(file: UploadFile = File(...)):
    if file.content_type not in settings.ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=415, detail=f"Unsupported file type: {file.content_type}")
    image_bytes = await file.read()
    if len(image_bytes) > settings.MAX_IMAGE_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image exceeds size limit")
    scan_id = str(uuid.uuid4())
    start = time.perf_counter()
    ocr_result = _ocr.process_image_bytes(image_bytes)
    pii_result = nlp_result = anomaly_result = None
    if ocr_result.extracted_text:
        pii_result = _pii.detect(ocr_result.extracted_text)
        nlp_result = _nlp.analyze(ocr_result.extracted_text)
        anomaly_result = _anomaly.score(
            ocr_result.extracted_text,
            pii_count=pii_result.total_matches if pii_result else 0,
        )
    risk_result = _risk.aggregate(
        pii_result=pii_result, nlp_result=nlp_result,
        anomaly_result=anomaly_result, ocr_result=ocr_result,
    )
    duration_ms = int((time.perf_counter() - start) * 1000)
    return _resp(scan_id, "image", {
        "ocr": ocr_result.to_dict(),
        "pii": pii_result.to_dict() if pii_result else {},
        "nlp": nlp_result.to_dict() if nlp_result else {},
        "anomaly": anomaly_result.to_dict() if anomaly_result else {},
        "risk": risk_result.to_dict(), "duration_ms": duration_ms,
    })


@router.post("/url")
async def scan_url(body: URLScanRequest):
    scan_id = str(uuid.uuid4())
    start = time.perf_counter()
    url_result = _url.analyze(body.url)
    detailed_threats = _url.get_detailed_threats(body.url, result=url_result)
    risk_result = _risk.aggregate(url_result=url_result)
    duration_ms = int((time.perf_counter() - start) * 1000)
    return _resp(scan_id, "url", {
        "url_analysis": url_result.to_dict(),
        "detailed_threats": detailed_threats,
        "risk": risk_result.to_dict(), "duration_ms": duration_ms,
    })


@router.websocket("/live")
async def live_scan(websocket: WebSocket):
    """WebSocket endpoint for real-time streaming scan analysis."""
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)
            text = payload.get("text", "")
            if not text:
                await websocket.send_json({"event": "error", "message": "No text provided"})
                continue
            await websocket.send_json({"event": "stage_start", "stage": "pii_detection"})
            pii_result = _pii.detect(text)
            await websocket.send_json({"event": "stage_complete", "stage": "pii_detection", "data": pii_result.to_dict()})
            await websocket.send_json({"event": "stage_start", "stage": "nlp_analysis"})
            nlp_result = _nlp.analyze(text)
            await websocket.send_json({"event": "stage_complete", "stage": "nlp_analysis", "data": nlp_result.to_dict()})
            await websocket.send_json({"event": "stage_start", "stage": "anomaly_detection"})
            anomaly_result = _anomaly.score(text, pii_count=pii_result.total_matches)
            await websocket.send_json({"event": "stage_complete", "stage": "anomaly_detection", "data": anomaly_result.to_dict()})
            await websocket.send_json({"event": "stage_start", "stage": "risk_scoring"})
            risk_result = _risk.aggregate(pii_result=pii_result, nlp_result=nlp_result, anomaly_result=anomaly_result)
            await websocket.send_json({"event": "scan_complete", "stage": "risk_scoring", "data": risk_result.to_dict()})
    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_json({"event": "error", "message": str(e)})
        except Exception:
            pass
