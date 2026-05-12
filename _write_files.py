"""Helper script to write all SafeShare AI source files."""
import os

def w(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"OK: {path}")

# ── scan.py ───────────────────────────────────────────────────────────────────
w("safeshare_ai/backend/app/api/routes/scan.py", """\
\"\"\"Scan API routes - text, image, URL, and live WebSocket scanning.\"\"\"
import hashlib, json, time, uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user
from app.core.config import settings
from app.models.models import ThreatScan, ThreatReport
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
async def scan_text(
    body: TextScanRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
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
    scan = ThreatScan(
        id=uuid.UUID(scan_id), user_id=uuid.UUID(current_user["user_id"]),
        scan_type="text", status="completed", risk_score=risk_result.final_score,
        risk_level=risk_result.risk_level,
        input_hash=hashlib.sha256(body.text.encode()).hexdigest(),
        input_preview=body.text[:200], scan_duration_ms=duration_ms,
        completed_at=datetime.now(timezone.utc),
    )
    db.add(scan)
    report = ThreatReport(
        scan_id=uuid.UUID(scan_id),
        pii_detections=[d.to_dict() for d in pii_result.detections],
        nlp_entities=[e.to_dict() for e in nlp_result.entities],
        anomaly_scores=anomaly_result.to_dict(),
        risk_breakdown=risk_result.to_dict(),
        ai_explanation="\\n".join(risk_result.reasoning_chain),
        model_confidence=risk_result.confidence,
        detection_pipeline=risk_result.pipeline_stages,
    )
    db.add(report)
    return _resp(scan_id, "text", {
        "pii": pii_result.to_dict(), "nlp": nlp_result.to_dict(),
        "anomaly": anomaly_result.to_dict(), "risk": risk_result.to_dict(),
        "duration_ms": duration_ms,
    })


@router.post("/image")
async def scan_image(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
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
    scan = ThreatScan(
        id=uuid.UUID(scan_id), user_id=uuid.UUID(current_user["user_id"]),
        scan_type="image", status="completed", risk_score=risk_result.final_score,
        risk_level=risk_result.risk_level,
        input_hash=hashlib.sha256(image_bytes).hexdigest(),
        input_preview=f"[IMAGE: {file.filename}]",
        scan_duration_ms=duration_ms, completed_at=datetime.now(timezone.utc),
    )
    db.add(scan)
    return _resp(scan_id, "image", {
        "ocr": ocr_result.to_dict(),
        "pii": pii_result.to_dict() if pii_result else {},
        "nlp": nlp_result.to_dict() if nlp_result else {},
        "anomaly": anomaly_result.to_dict() if anomaly_result else {},
        "risk": risk_result.to_dict(), "duration_ms": duration_ms,
    })


@router.post("/url")
async def scan_url(
    body: URLScanRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    scan_id = str(uuid.uuid4())
    start = time.perf_counter()
    url_result = _url.analyze(body.url)
    risk_result = _risk.aggregate(url_result=url_result)
    duration_ms = int((time.perf_counter() - start) * 1000)
    scan = ThreatScan(
        id=uuid.UUID(scan_id), user_id=uuid.UUID(current_user["user_id"]),
        scan_type="url", status="completed", risk_score=risk_result.final_score,
        risk_level=risk_result.risk_level,
        input_hash=hashlib.sha256(body.url.encode()).hexdigest(),
        input_preview=body.url[:200], scan_duration_ms=duration_ms,
        completed_at=datetime.now(timezone.utc),
    )
    db.add(scan)
    return _resp(scan_id, "url", {
        "url_analysis": url_result.to_dict(),
        "risk": risk_result.to_dict(), "duration_ms": duration_ms,
    })


@router.websocket("/live")
async def live_scan(websocket: WebSocket):
    \"\"\"WebSocket endpoint for real-time streaming scan analysis.\"\"\"
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
""")

# ── threats.py ────────────────────────────────────────────────────────────────
w("safeshare_ai/backend/app/api/routes/threats.py", """\
\"\"\"Threat history and reporting routes.\"\"\"
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import ThreatScan, ThreatReport

router = APIRouter()


@router.get("/history")
async def get_threat_history(
    limit: int = 20,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    result = await db.execute(
        select(ThreatScan)
        .where(ThreatScan.user_id == uuid.UUID(current_user["user_id"]))
        .order_by(desc(ThreatScan.created_at))
        .limit(limit).offset(offset)
    )
    scans = result.scalars().all()
    return {
        "scans": [
            {
                "id": str(s.id), "scan_type": s.scan_type, "status": s.status,
                "risk_score": s.risk_score, "risk_level": s.risk_level,
                "input_preview": s.input_preview, "duration_ms": s.scan_duration_ms,
                "created_at": s.created_at.isoformat() if s.created_at else None,
            }
            for s in scans
        ],
        "total": len(scans), "limit": limit, "offset": offset,
    }


@router.get("/{scan_id}/report")
async def get_scan_report(
    scan_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    result = await db.execute(
        select(ThreatReport).where(ThreatReport.scan_id == uuid.UUID(scan_id))
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return {
        "scan_id": scan_id,
        "pii_detections": report.pii_detections,
        "nlp_entities": report.nlp_entities,
        "anomaly_scores": report.anomaly_scores,
        "risk_breakdown": report.risk_breakdown,
        "ai_explanation": report.ai_explanation,
        "model_confidence": report.model_confidence,
        "detection_pipeline": report.detection_pipeline,
        "created_at": report.created_at.isoformat() if report.created_at else None,
    }
""")

# ── dashboard.py ──────────────────────────────────────────────────────────────
w("safeshare_ai/backend/app/api/routes/dashboard.py", """\
\"\"\"Dashboard analytics routes.\"\"\"
import uuid
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import ThreatScan

router = APIRouter()


@router.get("/analytics")
async def get_analytics(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    uid = uuid.UUID(current_user["user_id"])
    since = datetime.now(timezone.utc) - timedelta(days=30)

    total_result = await db.execute(
        select(func.count(ThreatScan.id)).where(ThreatScan.user_id == uid)
    )
    total_scans = total_result.scalar() or 0

    risk_result = await db.execute(
        select(ThreatScan.risk_level, func.count(ThreatScan.id))
        .where(ThreatScan.user_id == uid)
        .group_by(ThreatScan.risk_level)
    )
    risk_breakdown = {row[0]: row[1] for row in risk_result.all()}

    type_result = await db.execute(
        select(ThreatScan.scan_type, func.count(ThreatScan.id))
        .where(ThreatScan.user_id == uid)
        .group_by(ThreatScan.scan_type)
    )
    scan_types = {row[0]: row[1] for row in type_result.all()}

    recent_result = await db.execute(
        select(ThreatScan)
        .where(ThreatScan.user_id == uid)
        .order_by(desc(ThreatScan.created_at))
        .limit(5)
    )
    recent = recent_result.scalars().all()

    return {
        "total_scans": total_scans,
        "risk_breakdown": risk_breakdown,
        "scan_types": scan_types,
        "threats_blocked": risk_breakdown.get("critical", 0) + risk_breakdown.get("high", 0),
        "recent_scans": [
            {"id": str(s.id), "type": s.scan_type, "risk_level": s.risk_level,
             "risk_score": s.risk_score, "created_at": s.created_at.isoformat() if s.created_at else None}
            for s in recent
        ],
    }
""")

# ── admin.py ──────────────────────────────────────────────────────────────────
w("safeshare_ai/backend/app/api/routes/admin.py", """\
\"\"\"Admin routes - audit logs, user management.\"\"\"
from fastapi import APIRouter, Depends
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user, require_role, UserRole
from app.models.models import AuditLog, User

router = APIRouter()


@router.get("/audit")
async def get_audit_logs(
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role(UserRole.ADMIN, UserRole.ANALYST)),
):
    result = await db.execute(
        select(AuditLog).order_by(desc(AuditLog.created_at)).limit(limit)
    )
    logs = result.scalars().all()
    return {
        "logs": [
            {"id": str(l.id), "action": l.action, "resource_type": l.resource_type,
             "ip_address": l.ip_address, "metadata": l.metadata,
             "created_at": l.created_at.isoformat() if l.created_at else None}
            for l in logs
        ]
    }


@router.get("/users")
async def list_users(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role(UserRole.ADMIN)),
):
    result = await db.execute(select(User).where(User.is_active == True))
    users = result.scalars().all()
    return {
        "users": [
            {"id": str(u.id), "email": u.email, "full_name": u.full_name,
             "role": u.role, "created_at": u.created_at.isoformat() if u.created_at else None}
            for u in users
        ]
    }
""")

# ── policies.py ───────────────────────────────────────────────────────────────
w("safeshare_ai/backend/app/api/routes/policies.py", """\
\"\"\"Security policy management routes.\"\"\"
import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user, require_role, UserRole
from app.models.models import Policy

router = APIRouter()


class PolicyCreate(BaseModel):
    name: str
    description: str = ""
    rules: list = []
    severity_override: str | None = None


@router.get("/")
async def list_policies(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    org_id = current_user.get("org_id")
    if not org_id:
        return {"policies": []}
    result = await db.execute(
        select(Policy).where(Policy.org_id == uuid.UUID(org_id), Policy.is_active == True)
    )
    policies = result.scalars().all()
    return {
        "policies": [
            {"id": str(p.id), "name": p.name, "description": p.description,
             "rules": p.rules, "is_active": p.is_active,
             "created_at": p.created_at.isoformat() if p.created_at else None}
            for p in policies
        ]
    }


@router.post("/update")
async def create_or_update_policy(
    body: PolicyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role(UserRole.ADMIN, UserRole.ANALYST)),
):
    org_id = current_user.get("org_id")
    if not org_id:
        raise HTTPException(status_code=400, detail="No organization associated with user")
    policy = Policy(
        org_id=uuid.UUID(org_id),
        name=body.name,
        description=body.description,
        rules=body.rules,
        severity_override=body.severity_override,
    )
    db.add(policy)
    return {"message": "Policy created", "policy_id": str(policy.id)}
""")

# ── __init__ files ────────────────────────────────────────────────────────────
for init_path in [
    "safeshare_ai/backend/app/__init__.py",
    "safeshare_ai/backend/app/api/__init__.py",
    "safeshare_ai/backend/app/api/routes/__init__.py",
    "safeshare_ai/backend/app/core/__init__.py",
    "safeshare_ai/backend/app/models/__init__.py",
    "safeshare_ai/backend/app/ai_engine/__init__.py",
    "safeshare_ai/backend/app/nlp_services/__init__.py",
    "safeshare_ai/backend/app/ocr_pipeline/__init__.py",
    "safeshare_ai/backend/app/anomaly_detection/__init__.py",
    "safeshare_ai/backend/app/risk_engine/__init__.py",
    "safeshare_ai/backend/app/threat_intelligence/__init__.py",
    "safeshare_ai/backend/app/celery_workers/__init__.py",
]:
    w(init_path, "")

print("All backend files written.")


# ── FRONTEND: index.html ──────────────────────────────────────────────────────
w("safeshare_ai/frontend/index.html", open("safeshare_ai/_parts/index_html.txt", encoding="utf-8").read())
w("safeshare_ai/frontend/styles.css", open("safeshare_ai/_parts/styles_css.txt", encoding="utf-8").read())
w("safeshare_ai/frontend/script.js", open("safeshare_ai/_parts/script_js.txt", encoding="utf-8").read())

# ── Docker & env ──────────────────────────────────────────────────────────────
w("safeshare_ai/docker-compose.yml", open("safeshare_ai/_parts/docker_compose.txt", encoding="utf-8").read())
w("safeshare_ai/backend/.env", open("safeshare_ai/_parts/env.txt", encoding="utf-8").read())
w("safeshare_ai/backend/Dockerfile", open("safeshare_ai/_parts/dockerfile.txt", encoding="utf-8").read())

print("All files written successfully.")
