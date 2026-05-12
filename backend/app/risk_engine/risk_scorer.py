"""
Explainable AI Risk Scoring Engine
Aggregates outputs from all detectors into a weighted risk score with reasoning chain
"""

import time
from dataclasses import dataclass, field
from typing import Any

import structlog

logger = structlog.get_logger(__name__)

# Detector weights in the ensemble
DETECTOR_WEIGHTS = {
    "pii_detector": 0.30,
    "nlp_pipeline": 0.20,
    "anomaly_detector": 0.20,
    "url_analyzer": 0.20,
    "ocr_pipeline": 0.10,
}

RISK_LEVELS = [
    (0.85, "critical"),
    (0.65, "high"),
    (0.40, "medium"),
    (0.15, "low"),
    (0.0,  "safe"),
]


@dataclass
class RiskFactor:
    source: str
    score: float
    weight: float
    contribution: float
    label: str
    details: str

    def to_dict(self) -> dict:
        return {
            "source": self.source,
            "score": round(self.score, 4),
            "weight": self.weight,
            "contribution": round(self.contribution, 4),
            "label": self.label,
            "details": self.details,
        }


@dataclass
class RiskScore:
    final_score: float = 0.0
    risk_level: str = "safe"
    confidence: float = 0.0
    factors: list[RiskFactor] = field(default_factory=list)
    reasoning_chain: list[str] = field(default_factory=list)
    recommendations: list[str] = field(default_factory=list)
    processing_time_ms: float = 0.0
    pipeline_stages: list[dict] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "final_score": round(self.final_score, 4),
            "risk_level": self.risk_level,
            "confidence": round(self.confidence, 4),
            "factors": [f.to_dict() for f in self.factors],
            "reasoning_chain": self.reasoning_chain,
            "recommendations": self.recommendations,
            "processing_time_ms": round(self.processing_time_ms, 2),
            "pipeline_stages": self.pipeline_stages,
        }


class RiskScorer:
    """
    Explainable AI risk aggregation engine.
    Combines detector outputs with weighted ensemble scoring
    and generates human-readable reasoning chains.
    """

    def aggregate(
        self,
        pii_result: Any = None,
        nlp_result: Any = None,
        anomaly_result: Any = None,
        url_result: Any = None,
        ocr_result: Any = None,
    ) -> RiskScore:
        start = time.perf_counter()
        factors: list[RiskFactor] = []
        pipeline_stages = []

        # ── PII Detector ──────────────────────────────────────────────────────
        if pii_result:
            score = getattr(pii_result, "risk_score", 0.0)
            weight = DETECTOR_WEIGHTS["pii_detector"]
            contrib = score * weight
            factors.append(RiskFactor(
                source="pii_detector",
                score=score,
                weight=weight,
                contribution=contrib,
                label=f"PII/Credential Detection ({getattr(pii_result, 'total_matches', 0)} matches)",
                details=f"Highest severity: {getattr(pii_result, 'highest_severity', 'safe')}. "
                        f"Categories: {', '.join(getattr(pii_result, 'categories_found', []) or ['none'])}",
            ))
            pipeline_stages.append({
                "stage": "PII Detection",
                "score": round(score, 4),
                "status": "completed",
                "matches": getattr(pii_result, "total_matches", 0),
            })

        # ── NLP Pipeline ──────────────────────────────────────────────────────
        if nlp_result:
            entity_count = len(getattr(nlp_result, "entities", []))
            keyword_count = len(getattr(nlp_result, "threat_keywords", []))
            intent_count = len(getattr(nlp_result, "intent_labels", []))
            nlp_score = min((entity_count * 0.05 + keyword_count * 0.1 + intent_count * 0.15), 1.0)
            weight = DETECTOR_WEIGHTS["nlp_pipeline"]
            contrib = nlp_score * weight
            factors.append(RiskFactor(
                source="nlp_pipeline",
                score=nlp_score,
                weight=weight,
                contribution=contrib,
                label=f"NLP Analysis ({entity_count} entities, {keyword_count} threat keywords)",
                details=f"Intents: {', '.join(getattr(nlp_result, 'intent_labels', []) or ['none'])}",
            ))
            pipeline_stages.append({
                "stage": "NLP Analysis",
                "score": round(nlp_score, 4),
                "status": "completed",
                "entities": entity_count,
            })

        # ── Anomaly Detector ──────────────────────────────────────────────────
        if anomaly_result:
            score = getattr(anomaly_result, "anomaly_score", 0.0)
            weight = DETECTOR_WEIGHTS["anomaly_detector"]
            contrib = score * weight
            factors.append(RiskFactor(
                source="anomaly_detector",
                score=score,
                weight=weight,
                contribution=contrib,
                label=f"Behavioral Anomaly ({'anomalous' if getattr(anomaly_result, 'is_anomaly', False) else 'normal'})",
                details=getattr(anomaly_result, "explanation", ""),
            ))
            pipeline_stages.append({
                "stage": "Anomaly Detection",
                "score": round(score, 4),
                "status": "completed",
                "is_anomaly": getattr(anomaly_result, "is_anomaly", False),
            })

        # ── URL Analyzer ──────────────────────────────────────────────────────
        if url_result:
            score = getattr(url_result, "risk_score", 0.0)
            weight = DETECTOR_WEIGHTS["url_analyzer"]
            contrib = score * weight
            factors.append(RiskFactor(
                source="url_analyzer",
                score=score,
                weight=weight,
                contribution=contrib,
                label=f"URL Threat Analysis ({'phishing' if getattr(url_result, 'is_phishing', False) else 'clean'})",
                details=f"Indicators: {', '.join(getattr(url_result, 'threat_indicators', []) or ['none'])}",
            ))
            pipeline_stages.append({
                "stage": "URL Analysis",
                "score": round(score, 4),
                "status": "completed",
                "is_phishing": getattr(url_result, "is_phishing", False),
            })

        # ── OCR Pipeline ──────────────────────────────────────────────────────
        if ocr_result and getattr(ocr_result, "extracted_text", ""):
            ocr_score = 0.3 if getattr(ocr_result, "extracted_text", "") else 0.0
            weight = DETECTOR_WEIGHTS["ocr_pipeline"]
            contrib = ocr_score * weight
            factors.append(RiskFactor(
                source="ocr_pipeline",
                score=ocr_score,
                weight=weight,
                contribution=contrib,
                label="OCR Text Extraction",
                details=f"Extracted {len(getattr(ocr_result, 'extracted_text', ''))} chars via {getattr(ocr_result, 'engine_used', 'unknown')}",
            ))
            pipeline_stages.append({
                "stage": "OCR Processing",
                "score": round(ocr_score, 4),
                "status": "completed",
                "chars_extracted": len(getattr(ocr_result, "extracted_text", "")),
            })

        # ── Final Score ───────────────────────────────────────────────────────
        total_weight = sum(f.weight for f in factors)
        if total_weight > 0:
            final_score = sum(f.contribution for f in factors) / total_weight
        else:
            final_score = 0.0

        final_score = min(final_score, 1.0)
        risk_level = self._classify_risk(final_score)
        confidence = self._calculate_confidence(factors)
        reasoning = self._build_reasoning(factors, final_score, risk_level)
        recommendations = self._generate_recommendations(risk_level, factors)

        elapsed = (time.perf_counter() - start) * 1000

        return RiskScore(
            final_score=final_score,
            risk_level=risk_level,
            confidence=confidence,
            factors=factors,
            reasoning_chain=reasoning,
            recommendations=recommendations,
            processing_time_ms=elapsed,
            pipeline_stages=pipeline_stages,
        )

    def _classify_risk(self, score: float) -> str:
        for threshold, level in RISK_LEVELS:
            if score >= threshold:
                return level
        return "safe"

    def _calculate_confidence(self, factors: list[RiskFactor]) -> float:
        if not factors:
            return 0.5
        # More detectors = higher confidence
        base = 0.5 + (len(factors) / len(DETECTOR_WEIGHTS)) * 0.4
        return min(base, 0.95)

    def _build_reasoning(self, factors: list[RiskFactor], score: float, level: str) -> list[str]:
        chain = [f"Risk assessment initiated with {len(factors)} active detection modules."]
        for f in sorted(factors, key=lambda x: x.contribution, reverse=True):
            chain.append(
                f"[{f.source.upper()}] Score {f.score:.2f} × weight {f.weight} "
                f"= contribution {f.contribution:.3f}. {f.details}"
            )
        chain.append(
            f"Aggregated risk score: {score:.4f} → classified as '{level.upper()}'."
        )
        return chain

    def _generate_recommendations(self, level: str, factors: list[RiskFactor]) -> list[str]:
        recs = []
        sources = {f.source for f in factors if f.score > 0.3}

        if level in ("critical", "high"):
            recs.append("Block transmission immediately and alert security team.")
            recs.append("Initiate incident response protocol.")
        if level == "medium":
            recs.append("Review content before sharing. Consider redacting sensitive fields.")
        if "pii_detector" in sources:
            recs.append("Redact all PII/credential data before sharing externally.")
        if "url_analyzer" in sources:
            recs.append("Do not click or share detected URLs without verification.")
        if "anomaly_detector" in sources:
            recs.append("Unusual content patterns detected — manual review recommended.")
        if level == "safe":
            recs.append("Content appears safe. Standard sharing policies apply.")

        return recs
