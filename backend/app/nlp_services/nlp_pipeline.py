"""
NLP Pipeline Service
spaCy + Transformers + Presidio for entity recognition and contextual classification
"""

import time
from dataclasses import dataclass, field
from typing import Any

import structlog

logger = structlog.get_logger(__name__)

# Lazy-loaded models to avoid import-time crashes in environments without GPU
_spacy_nlp = None
_presidio_analyzer = None


def _get_spacy():
    global _spacy_nlp
    if _spacy_nlp is None:
        try:
            import spacy
            _spacy_nlp = spacy.load("en_core_web_sm")
        except Exception as e:
            logger.warning("spacy_load_failed", error=str(e))
            _spacy_nlp = False
    return _spacy_nlp if _spacy_nlp else None


def _get_presidio():
    global _presidio_analyzer
    if _presidio_analyzer is None:
        try:
            from presidio_analyzer import AnalyzerEngine
            _presidio_analyzer = AnalyzerEngine()
        except Exception as e:
            logger.warning("presidio_load_failed", error=str(e))
            _presidio_analyzer = False
    return _presidio_analyzer if _presidio_analyzer else None


@dataclass
class NLPEntity:
    text: str
    label: str
    start: int
    end: int
    confidence: float
    source: str  # spacy | presidio | regex

    def to_dict(self) -> dict:
        return {
            "text": self.text[:4] + "****" if len(self.text) > 4 else "****",
            "label": self.label,
            "position": {"start": self.start, "end": self.end},
            "confidence": round(self.confidence, 4),
            "source": self.source,
        }


@dataclass
class NLPResult:
    entities: list[NLPEntity] = field(default_factory=list)
    intent_labels: list[str] = field(default_factory=list)
    threat_keywords: list[str] = field(default_factory=list)
    sentiment: str = "neutral"
    processing_time_ms: float = 0.0
    token_count: int = 0

    def to_dict(self) -> dict:
        return {
            "entities": [e.to_dict() for e in self.entities],
            "intent_labels": self.intent_labels,
            "threat_keywords": self.threat_keywords,
            "sentiment": self.sentiment,
            "processing_time_ms": round(self.processing_time_ms, 2),
            "token_count": self.token_count,
        }


# Keywords that indicate sensitive/threatening content
THREAT_KEYWORDS = [
    "confidential", "secret", "internal only", "do not share", "proprietary",
    "classified", "restricted", "private key", "access token", "api key",
    "password", "credentials", "ssn", "social security", "bank account",
    "credit card", "aadhaar", "pan number", "passport", "phishing",
    "malware", "exploit", "vulnerability", "breach", "leak",
]

INTENT_PATTERNS = {
    "data_exfiltration": ["send", "upload", "share", "transfer", "export", "copy"],
    "credential_sharing": ["password", "token", "key", "secret", "credential", "login"],
    "financial_data": ["account", "routing", "swift", "iban", "credit", "debit", "bank"],
    "identity_data": ["ssn", "aadhaar", "passport", "license", "dob", "date of birth"],
    "infrastructure_leak": ["server", "database", "endpoint", "internal", "vpn", "firewall"],
}


class NLPPipeline:
    """
    Multi-source NLP pipeline combining spaCy NER, Presidio PII detection,
    and keyword-based intent classification.
    """

    def analyze(self, text: str) -> NLPResult:
        start = time.perf_counter()
        entities: list[NLPEntity] = []

        # 1. spaCy NER
        nlp = _get_spacy()
        if nlp:
            try:
                doc = nlp(text[:10000])  # cap for performance
                for ent in doc.ents:
                    if ent.label_ in {"PERSON", "ORG", "GPE", "MONEY", "DATE", "CARDINAL"}:
                        entities.append(NLPEntity(
                            text=ent.text,
                            label=ent.label_,
                            start=ent.start_char,
                            end=ent.end_char,
                            confidence=0.82,
                            source="spacy",
                        ))
            except Exception as e:
                logger.warning("spacy_analysis_error", error=str(e))

        # 2. Presidio PII detection
        analyzer = _get_presidio()
        if analyzer:
            try:
                results = analyzer.analyze(text=text[:10000], language="en")
                for r in results:
                    entities.append(NLPEntity(
                        text=text[r.start:r.end],
                        label=r.entity_type,
                        start=r.start,
                        end=r.end,
                        confidence=r.score,
                        source="presidio",
                    ))
            except Exception as e:
                logger.warning("presidio_analysis_error", error=str(e))

        # 3. Keyword-based threat detection
        text_lower = text.lower()
        found_keywords = [kw for kw in THREAT_KEYWORDS if kw in text_lower]

        # 4. Intent classification
        intent_labels = []
        for intent, keywords in INTENT_PATTERNS.items():
            if any(kw in text_lower for kw in keywords):
                intent_labels.append(intent)

        # 5. Simple sentiment (threat-oriented)
        negative_words = ["leak", "breach", "stolen", "exposed", "compromised", "attack", "hack"]
        sentiment = "negative" if any(w in text_lower for w in negative_words) else "neutral"

        elapsed = (time.perf_counter() - start) * 1000

        return NLPResult(
            entities=entities,
            intent_labels=intent_labels,
            threat_keywords=found_keywords,
            sentiment=sentiment,
            processing_time_ms=elapsed,
            token_count=len(text.split()),
        )
