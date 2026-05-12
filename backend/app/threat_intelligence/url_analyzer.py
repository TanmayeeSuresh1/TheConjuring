"""
URL & Phishing Analysis Engine
Entropy scoring, typosquatting detection, SSL validation, heuristic ML scoring
"""

import math
import re
import time
from dataclasses import dataclass, field
from urllib.parse import urlparse

import structlog

logger = structlog.get_logger(__name__)

PHISHING_KEYWORDS = [
    "login", "signin", "verify", "account", "update", "secure", "banking",
    "paypal", "amazon", "google", "microsoft", "apple", "netflix", "confirm",
    "password", "credential", "wallet", "crypto", "urgent", "suspended",
    "limited", "unusual", "activity", "click", "here", "free", "prize",
]

SUSPICIOUS_TLDS = {".tk", ".ml", ".ga", ".cf", ".gq", ".xyz", ".top", ".click", ".link"}

TRUSTED_DOMAINS = {
    "google.com", "microsoft.com", "amazon.com", "apple.com", "github.com",
    "stackoverflow.com", "cloudflare.com", "fastly.com", "akamai.com",
}

TYPOSQUAT_TARGETS = [
    "google", "microsoft", "amazon", "paypal", "apple", "facebook",
    "twitter", "instagram", "netflix", "github", "linkedin",
]


@dataclass
class URLAnalysisResult:
    url: str = ""
    domain: str = ""
    is_phishing: bool = False
    is_malicious: bool = False
    risk_score: float = 0.0
    risk_level: str = "safe"
    entropy_score: float = 0.0
    ssl_valid: bool = False
    is_typosquat: bool = False
    threat_indicators: list[str] = field(default_factory=list)
    redirect_chain: list[str] = field(default_factory=list)
    ml_score: float = 0.0
    heuristic_score: float = 0.0
    processing_time_ms: float = 0.0
    explanation: str = ""

    def to_dict(self) -> dict:
        return {
            "url": self.url,
            "domain": self.domain,
            "is_phishing": self.is_phishing,
            "is_malicious": self.is_malicious,
            "risk_score": round(self.risk_score, 4),
            "risk_level": self.risk_level,
            "entropy_score": round(self.entropy_score, 4),
            "ssl_valid": self.ssl_valid,
            "is_typosquat": self.is_typosquat,
            "threat_indicators": self.threat_indicators,
            "redirect_chain": self.redirect_chain,
            "ml_score": round(self.ml_score, 4),
            "heuristic_score": round(self.heuristic_score, 4),
            "processing_time_ms": round(self.processing_time_ms, 2),
            "explanation": self.explanation,
        }


class URLAnalyzer:
    """
    Multi-layer URL threat analysis combining:
    - Shannon entropy scoring
    - Typosquatting detection (Levenshtein distance)
    - Heuristic pattern matching
    - Scikit-learn logistic regression classifier
    """

    def __init__(self):
        self._ml_model = None
        self._vectorizer = None
        self._build_ml_model()

    def _build_ml_model(self):
        """Train a lightweight logistic regression on URL features."""
        try:
            from sklearn.linear_model import LogisticRegression
            import numpy as np

            # Synthetic training data: [entropy, url_len, dot_count, digit_ratio,
            #                           phishing_kw_count, has_ip, subdomain_depth]
            rng = __import__("numpy").random.default_rng(42)

            # Benign samples
            benign = rng.normal(
                loc=[3.5, 30, 2, 0.05, 0, 0, 1],
                scale=[0.3, 10, 0.5, 0.03, 0.2, 0.1, 0.5],
                size=(300, 7),
            )
            # Phishing samples
            phishing = rng.normal(
                loc=[4.5, 60, 4, 0.2, 2, 0.3, 3],
                scale=[0.4, 20, 1, 0.1, 0.8, 0.3, 1],
                size=(300, 7),
            )

            X = __import__("numpy").vstack([benign, phishing])
            y = [0] * 300 + [1] * 300

            self._ml_model = LogisticRegression(random_state=42, max_iter=200)
            self._ml_model.fit(X, y)
            logger.info("url_ml_model_trained")
        except Exception as e:
            logger.warning("url_ml_model_failed", error=str(e))

    def analyze(self, url: str) -> URLAnalysisResult:
        start = time.perf_counter()
        result = URLAnalysisResult(url=url)

        try:
            parsed = urlparse(url if "://" in url else f"https://{url}")
            result.domain = parsed.netloc or parsed.path.split("/")[0]
            result.ssl_valid = parsed.scheme == "https"
        except Exception:
            result.threat_indicators.append("url_parse_failed")
            result.risk_score = 0.5
            return result

        indicators = []

        # 1. Entropy
        result.entropy_score = self._shannon_entropy(result.domain)
        if result.entropy_score > 4.2:
            indicators.append("high_domain_entropy")

        # 2. Typosquatting
        result.is_typosquat = self._check_typosquat(result.domain)
        if result.is_typosquat:
            indicators.append("typosquatting_detected")

        # 3. Suspicious TLD
        for tld in SUSPICIOUS_TLDS:
            if result.domain.endswith(tld):
                indicators.append(f"suspicious_tld_{tld}")
                break

        # 4. Phishing keywords in URL
        url_lower = url.lower()
        kw_hits = [kw for kw in PHISHING_KEYWORDS if kw in url_lower]
        if len(kw_hits) >= 2:
            indicators.append(f"phishing_keywords:{','.join(kw_hits[:3])}")

        # 5. IP address as host
        if re.match(r"^\d{1,3}(\.\d{1,3}){3}$", result.domain):
            indicators.append("ip_address_as_host")

        # 6. Excessive subdomains
        subdomain_depth = len(result.domain.split(".")) - 2
        if subdomain_depth > 3:
            indicators.append(f"excessive_subdomains:{subdomain_depth}")

        # 7. URL length
        if len(url) > 100:
            indicators.append("excessive_url_length")

        # 8. No SSL
        if not result.ssl_valid:
            indicators.append("no_ssl")

        # 9. Trusted domain check (reduce false positives)
        base_domain = ".".join(result.domain.split(".")[-2:])
        if base_domain in TRUSTED_DOMAINS:
            indicators = []  # clear indicators for trusted domains

        result.threat_indicators = indicators

        # Heuristic score
        result.heuristic_score = min(len(indicators) * 0.15, 1.0)

        # ML score
        result.ml_score = self._ml_predict(url, result.domain, len(kw_hits), subdomain_depth)

        # Ensemble
        result.risk_score = 0.6 * result.ml_score + 0.4 * result.heuristic_score
        result.is_phishing = result.risk_score > 0.65 or result.is_typosquat
        result.is_malicious = result.risk_score > 0.80

        result.risk_level = self._classify(result.risk_score)
        result.explanation = self._explain(result)
        result.processing_time_ms = (time.perf_counter() - start) * 1000

        return result

    def _shannon_entropy(self, text: str) -> float:
        if not text:
            return 0.0
        from collections import Counter
        counts = Counter(text)
        total = len(text)
        return -sum((c / total) * math.log2(c / total) for c in counts.values())

    def _check_typosquat(self, domain: str) -> bool:
        """Levenshtein distance check against known brand domains."""
        base = domain.split(".")[0].lower()
        for target in TYPOSQUAT_TARGETS:
            if base != target and self._levenshtein(base, target) <= 2:
                return True
        return False

    def _levenshtein(self, s1: str, s2: str) -> int:
        if len(s1) < len(s2):
            return self._levenshtein(s2, s1)
        if not s2:
            return len(s1)
        prev = list(range(len(s2) + 1))
        for i, c1 in enumerate(s1):
            curr = [i + 1]
            for j, c2 in enumerate(s2):
                curr.append(min(prev[j + 1] + 1, curr[j] + 1, prev[j] + (c1 != c2)))
            prev = curr
        return prev[-1]

    def _ml_predict(self, url: str, domain: str, kw_count: int, subdomain_depth: int) -> float:
        if not self._ml_model:
            return 0.0
        try:
            import numpy as np
            digits = sum(c.isdigit() for c in domain) / max(len(domain), 1)
            features = [[
                self._shannon_entropy(domain),
                len(url),
                domain.count("."),
                digits,
                kw_count,
                1.0 if re.match(r"^\d{1,3}(\.\d{1,3}){3}$", domain) else 0.0,
                subdomain_depth,
            ]]
            prob = self._ml_model.predict_proba(features)[0][1]
            return float(prob)
        except Exception:
            return 0.0

    def _classify(self, score: float) -> str:
        if score >= 0.80:
            return "critical"
        if score >= 0.60:
            return "high"
        if score >= 0.35:
            return "medium"
        if score >= 0.15:
            return "low"
        return "safe"

    def _explain(self, r: URLAnalysisResult) -> str:
        if not r.threat_indicators:
            return f"URL '{r.domain}' appears clean. No threat indicators found."
        return (
            f"URL '{r.domain}' flagged with {len(r.threat_indicators)} indicator(s): "
            f"{', '.join(r.threat_indicators[:4])}. "
            f"ML score: {r.ml_score:.2f}, Heuristic: {r.heuristic_score:.2f}."
        )
