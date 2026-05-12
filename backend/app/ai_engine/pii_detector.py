"""
PII & Credential Detection Engine
Uses Microsoft Presidio + spaCy + custom regex patterns
"""

import re
import time
from dataclasses import dataclass, field
from typing import Any

import structlog

logger = structlog.get_logger(__name__)

# ── Regex pattern library ──────────────────────────────────────────────────────

PATTERNS: dict[str, dict[str, Any]] = {
    # Credentials
    "aws_access_key": {
        "pattern": r"(?<![A-Z0-9])(AKIA|ABIA|ACCA|ASIA)[A-Z0-9]{16}(?![A-Z0-9])",
        "severity": "critical",
        "category": "credential",
        "label": "AWS Access Key",
    },
    "aws_secret_key": {
        "pattern": r"(?i)aws.{0,20}['\"][0-9a-zA-Z/+]{40}['\"]",
        "severity": "critical",
        "category": "credential",
        "label": "AWS Secret Key",
    },
    "github_token": {
        "pattern": r"ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{82}",
        "severity": "critical",
        "category": "credential",
        "label": "GitHub Token",
    },
    "google_api_key": {
        "pattern": r"AIza[0-9A-Za-z\-_]{35}",
        "severity": "critical",
        "category": "credential",
        "label": "Google API Key",
    },
    "jwt_token": {
        "pattern": r"eyJ[A-Za-z0-9\-_]+\.eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+",
        "severity": "high",
        "category": "credential",
        "label": "JWT Token",
    },
    "private_key": {
        "pattern": r"-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----",
        "severity": "critical",
        "category": "credential",
        "label": "Private Key",
    },
    "password_in_code": {
        "pattern": r"(?i)(password|passwd|pwd|secret|api_key|apikey|token)\s*[=:]\s*['\"][^'\"]{6,}['\"]",
        "severity": "high",
        "category": "credential",
        "label": "Hardcoded Password/Secret",
    },
    "bearer_token": {
        "pattern": r"(?i)bearer\s+[A-Za-z0-9\-._~+/]+=*",
        "severity": "high",
        "category": "credential",
        "label": "Bearer Token",
    },
    "slack_token": {
        "pattern": r"xox[baprs]-[0-9A-Za-z\-]{10,48}",
        "severity": "critical",
        "category": "credential",
        "label": "Slack Token",
    },
    "stripe_key": {
        "pattern": r"(?:sk|pk)_(test|live)_[0-9a-zA-Z]{24,}",
        "severity": "critical",
        "category": "credential",
        "label": "Stripe API Key",
    },
    "database_url": {
        "pattern": r"(?i)(postgres|mysql|mongodb|redis|sqlite)://[^\s'\"<>]+",
        "severity": "critical",
        "category": "infrastructure",
        "label": "Database Connection String",
    },
    # PII - India specific
    "aadhaar": {
        "pattern": r"\b[2-9]{1}[0-9]{3}\s?[0-9]{4}\s?[0-9]{4}\b",
        "severity": "critical",
        "category": "pii",
        "label": "Aadhaar Number",
    },
    "pan_card": {
        "pattern": r"\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b",
        "severity": "high",
        "category": "pii",
        "label": "PAN Card Number",
    },
    "indian_phone": {
        "pattern": r"(?:\+91|0)?[6-9]\d{9}\b",
        "severity": "medium",
        "category": "pii",
        "label": "Indian Phone Number",
    },
    # PII - Global
    "credit_card": {
        "pattern": r"\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12})\b",
        "severity": "critical",
        "category": "financial",
        "label": "Credit Card Number",
    },
    "ssn": {
        "pattern": r"\b(?!000|666|9\d{2})\d{3}-(?!00)\d{2}-(?!0000)\d{4}\b",
        "severity": "critical",
        "category": "pii",
        "label": "Social Security Number",
    },
    "email": {
        "pattern": r"\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b",
        "severity": "low",
        "category": "pii",
        "label": "Email Address",
    },
    "ip_address": {
        "pattern": r"\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b",
        "severity": "low",
        "category": "infrastructure",
        "label": "IP Address",
    },
    "bank_account": {
        "pattern": r"\b[0-9]{9,18}\b(?=.*\b(account|acct|bank)\b)",
        "severity": "high",
        "category": "financial",
        "label": "Bank Account Number",
    },
    "ifsc_code": {
        "pattern": r"\b[A-Z]{4}0[A-Z0-9]{6}\b",
        "severity": "medium",
        "category": "financial",
        "label": "IFSC Code",
    },
    # Source code leaks
    "connection_string": {
        "pattern": r"(?i)(server|host|hostname)\s*=\s*[^\s;,\"']+",
        "severity": "high",
        "category": "infrastructure",
        "label": "Server Connection String",
    },
    "env_variable_secret": {
        "pattern": r"(?i)(SECRET|KEY|TOKEN|PASSWORD|PASS|PWD|CREDENTIAL)\s*=\s*[^\s\n]{8,}",
        "severity": "high",
        "category": "credential",
        "label": "Environment Variable Secret",
    },
}

SEVERITY_WEIGHTS = {"critical": 1.0, "high": 0.75, "medium": 0.5, "low": 0.25}


@dataclass
class Detection:
    pattern_id: str
    label: str
    category: str
    severity: str
    matched_text: str
    start: int
    end: int
    confidence: float
    redacted: str = ""

    def to_dict(self) -> dict:
        return {
            "pattern_id": self.pattern_id,
            "label": self.label,
            "category": self.category,
            "severity": self.severity,
            "matched_text": self.redacted or self._redact(self.matched_text),
            "position": {"start": self.start, "end": self.end},
            "confidence": round(self.confidence, 4),
        }

    @staticmethod
    def _redact(text: str) -> str:
        if len(text) <= 4:
            return "****"
        return text[:2] + "*" * (len(text) - 4) + text[-2:]


@dataclass
class PIIDetectionResult:
    detections: list[Detection] = field(default_factory=list)
    risk_score: float = 0.0
    processing_time_ms: float = 0.0
    total_matches: int = 0
    categories_found: list[str] = field(default_factory=list)
    highest_severity: str = "safe"

    def to_dict(self) -> dict:
        return {
            "detections": [d.to_dict() for d in self.detections],
            "risk_score": round(self.risk_score, 4),
            "processing_time_ms": round(self.processing_time_ms, 2),
            "total_matches": self.total_matches,
            "categories_found": self.categories_found,
            "highest_severity": self.highest_severity,
        }


class PIIDetector:
    """
    Multi-layer PII and credential detection engine.
    Combines regex patterns with confidence scoring.
    """

    def __init__(self):
        self._compiled: dict[str, re.Pattern] = {}
        self._compile_patterns()
        logger.info("PIIDetector initialized", pattern_count=len(PATTERNS))

    def _compile_patterns(self):
        for pid, cfg in PATTERNS.items():
            try:
                self._compiled[pid] = re.compile(cfg["pattern"], re.MULTILINE)
            except re.error as e:
                logger.warning("pattern_compile_error", pattern_id=pid, error=str(e))

    def detect(self, text: str) -> PIIDetectionResult:
        """Run all detection patterns against input text."""
        start_time = time.perf_counter()
        detections: list[Detection] = []

        for pid, pattern in self._compiled.items():
            cfg = PATTERNS[pid]
            for match in pattern.finditer(text):
                confidence = self._calculate_confidence(match.group(), pid, text)
                detections.append(
                    Detection(
                        pattern_id=pid,
                        label=cfg["label"],
                        category=cfg["category"],
                        severity=cfg["severity"],
                        matched_text=match.group(),
                        start=match.start(),
                        end=match.end(),
                        confidence=confidence,
                    )
                )

        # Deduplicate overlapping matches (keep highest confidence)
        detections = self._deduplicate(detections)

        risk_score = self._calculate_risk_score(detections)
        categories = list({d.category for d in detections})
        highest = self._highest_severity(detections)

        elapsed = (time.perf_counter() - start_time) * 1000

        return PIIDetectionResult(
            detections=detections,
            risk_score=risk_score,
            processing_time_ms=elapsed,
            total_matches=len(detections),
            categories_found=categories,
            highest_severity=highest,
        )

    def _calculate_confidence(self, matched: str, pattern_id: str, context: str) -> float:
        """Heuristic confidence based on match quality and context."""
        base = 0.85
        # Boost for longer matches (less likely false positive)
        if len(matched) > 20:
            base += 0.05
        # Boost for critical patterns
        if PATTERNS[pattern_id]["severity"] == "critical":
            base += 0.05
        # Context boost: if surrounded by relevant keywords
        keywords = ["key", "token", "secret", "password", "api", "auth", "credential"]
        ctx_lower = context[max(0, context.find(matched) - 50): context.find(matched) + 50].lower()
        if any(kw in ctx_lower for kw in keywords):
            base += 0.05
        return min(base, 0.99)

    def _deduplicate(self, detections: list[Detection]) -> list[Detection]:
        """Remove overlapping detections, keeping highest confidence."""
        if not detections:
            return detections
        detections.sort(key=lambda d: (d.start, -d.confidence))
        result = [detections[0]]
        for det in detections[1:]:
            last = result[-1]
            if det.start >= last.end:
                result.append(det)
            elif det.confidence > last.confidence:
                result[-1] = det
        return result

    def _calculate_risk_score(self, detections: list[Detection]) -> float:
        if not detections:
            return 0.0
        weighted_sum = sum(
            SEVERITY_WEIGHTS.get(d.severity, 0.25) * d.confidence
            for d in detections
        )
        # Normalize: cap at 1.0, scale by count
        count_factor = min(len(detections) / 5, 1.0)
        base_score = min(weighted_sum / max(len(detections), 1), 1.0)
        return round(min(base_score + count_factor * 0.2, 1.0), 4)

    def _highest_severity(self, detections: list[Detection]) -> str:
        if not detections:
            return "safe"
        order = ["safe", "low", "medium", "high", "critical"]
        severities = {d.severity for d in detections}
        for level in reversed(order):
            if level in severities:
                return level
        return "safe"
