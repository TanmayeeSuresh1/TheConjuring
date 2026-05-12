"""
Anomaly Detection Engine
Isolation Forest + ensemble scoring for behavioral anomaly detection
"""

import time
from dataclasses import dataclass, field

import numpy as np
import structlog
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

logger = structlog.get_logger(__name__)


@dataclass
class AnomalyResult:
    is_anomaly: bool = False
    anomaly_score: float = 0.0
    feature_contributions: dict = field(default_factory=dict)
    processing_time_ms: float = 0.0
    explanation: str = ""

    def to_dict(self) -> dict:
        return {
            "is_anomaly": self.is_anomaly,
            "anomaly_score": round(self.anomaly_score, 4),
            "feature_contributions": self.feature_contributions,
            "processing_time_ms": round(self.processing_time_ms, 2),
            "explanation": self.explanation,
        }


class AnomalyDetector:
    """
    Isolation Forest-based anomaly detector for text content.
    Extracts statistical features and scores against a baseline distribution.
    """

    def __init__(self, contamination: float = 0.1):
        self.contamination = contamination
        self.model = IsolationForest(
            n_estimators=100,
            contamination=contamination,
            random_state=42,
            n_jobs=-1,
        )
        self.scaler = StandardScaler()
        self._fitted = False
        self._fit_baseline()

    def _fit_baseline(self):
        """Fit on synthetic baseline of normal text features."""
        rng = np.random.default_rng(42)
        # Simulate 500 normal text samples
        baseline = rng.normal(
            loc=[50, 0.05, 0.1, 0.02, 0.0, 0.3, 0.1],
            scale=[20, 0.03, 0.05, 0.02, 0.01, 0.1, 0.05],
            size=(500, 7),
        )
        baseline = np.clip(baseline, 0, None)
        scaled = self.scaler.fit_transform(baseline)
        self.model.fit(scaled)
        self._fitted = True
        logger.info("anomaly_detector_fitted", baseline_samples=500)

    def extract_features(self, text: str, pii_count: int = 0, credential_count: int = 0) -> np.ndarray:
        """Extract numerical features from text for anomaly scoring."""
        words = text.split()
        chars = list(text)
        total_chars = max(len(chars), 1)
        total_words = max(len(words), 1)

        # Feature vector
        features = [
            total_words,                                          # word count
            sum(1 for c in chars if not c.isalnum()) / total_chars,  # special char ratio
            pii_count / max(total_words / 10, 1),                # PII density
            credential_count / max(total_words / 10, 1),         # credential density
            self._entropy_score(text),                           # Shannon entropy
            sum(1 for w in words if len(w) > 20) / total_words,  # long token ratio
            sum(1 for c in chars if c.isupper()) / total_chars,  # uppercase ratio
        ]
        return np.array(features, dtype=float).reshape(1, -1)

    def _entropy_score(self, text: str) -> float:
        """Shannon entropy normalized to [0, 1]."""
        if not text:
            return 0.0
        from collections import Counter
        counts = Counter(text)
        total = len(text)
        entropy = -sum((c / total) * np.log2(c / total) for c in counts.values())
        return min(entropy / 8.0, 1.0)  # normalize by max entropy for 256 chars

    def score(self, text: str, pii_count: int = 0, credential_count: int = 0) -> AnomalyResult:
        start = time.perf_counter()

        features = self.extract_features(text, pii_count, credential_count)
        scaled = self.scaler.transform(features)

        # Isolation Forest: -1 = anomaly, 1 = normal
        prediction = self.model.predict(scaled)[0]
        raw_score = self.model.score_samples(scaled)[0]

        # Convert to [0, 1] anomaly probability (higher = more anomalous)
        anomaly_score = max(0.0, min(1.0, 1.0 - (raw_score + 0.5)))

        feature_names = [
            "word_count", "special_char_ratio", "pii_density",
            "credential_density", "entropy", "long_token_ratio", "uppercase_ratio",
        ]
        contributions = {
            name: round(float(features[0][i]), 4)
            for i, name in enumerate(feature_names)
        }

        explanation = self._explain(anomaly_score, contributions)
        elapsed = (time.perf_counter() - start) * 1000

        return AnomalyResult(
            is_anomaly=prediction == -1,
            anomaly_score=anomaly_score,
            feature_contributions=contributions,
            processing_time_ms=elapsed,
            explanation=explanation,
        )

    def _explain(self, score: float, features: dict) -> str:
        reasons = []
        if features.get("pii_density", 0) > 0.1:
            reasons.append("high PII density")
        if features.get("credential_density", 0) > 0.05:
            reasons.append("credential patterns detected")
        if features.get("entropy", 0) > 0.7:
            reasons.append("high entropy (possible encoded data)")
        if features.get("special_char_ratio", 0) > 0.15:
            reasons.append("unusual special character ratio")
        if features.get("uppercase_ratio", 0) > 0.4:
            reasons.append("abnormal uppercase ratio")

        if not reasons:
            return "Content appears within normal parameters."
        return f"Anomaly detected: {', '.join(reasons)}. Score: {score:.2f}"
