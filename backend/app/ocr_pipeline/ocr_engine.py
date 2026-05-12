"""
OCR Pipeline Engine
EasyOCR + Tesseract + OpenCV for screenshot and document analysis
"""

import io
import time
from dataclasses import dataclass, field
from pathlib import Path

import structlog

logger = structlog.get_logger(__name__)


@dataclass
class BoundingBox:
    x: int
    y: int
    width: int
    height: int
    text: str
    confidence: float

    def to_dict(self) -> dict:
        return {
            "x": self.x, "y": self.y,
            "width": self.width, "height": self.height,
            "text": self.text,
            "confidence": round(self.confidence, 4),
        }


@dataclass
class OCRResult:
    extracted_text: str = ""
    bounding_boxes: list[BoundingBox] = field(default_factory=list)
    engine_used: str = "none"
    confidence: float = 0.0
    processing_time_ms: float = 0.0
    qr_codes: list[str] = field(default_factory=list)
    error: str = ""

    def to_dict(self) -> dict:
        return {
            "extracted_text": self.extracted_text,
            "bounding_boxes": [b.to_dict() for b in self.bounding_boxes],
            "engine_used": self.engine_used,
            "confidence": round(self.confidence, 4),
            "processing_time_ms": round(self.processing_time_ms, 2),
            "qr_codes": self.qr_codes,
            "error": self.error,
        }


class OCREngine:
    """
    Multi-engine OCR pipeline with automatic fallback.
    Primary: EasyOCR | Fallback: Tesseract | QR: OpenCV
    """

    def __init__(self):
        self._easyocr_reader = None
        self._easyocr_available = None

    def _get_easyocr(self):
        if self._easyocr_available is None:
            try:
                import easyocr
                self._easyocr_reader = easyocr.Reader(["en"], gpu=False, verbose=False)
                self._easyocr_available = True
                logger.info("easyocr_initialized")
            except Exception as e:
                logger.warning("easyocr_unavailable", error=str(e))
                self._easyocr_available = False
        return self._easyocr_reader if self._easyocr_available else None

    def process_image_bytes(self, image_bytes: bytes) -> OCRResult:
        """Process raw image bytes through the OCR pipeline."""
        start = time.perf_counter()

        try:
            import numpy as np
            from PIL import Image

            img = Image.open(io.BytesIO(image_bytes))
            # Convert to RGB if needed
            if img.mode not in ("RGB", "L"):
                img = img.convert("RGB")

            img_array = np.array(img)
        except Exception as e:
            return OCRResult(error=f"Image decode failed: {e}")

        # Try EasyOCR first
        result = self._run_easyocr(img_array, start)
        if result.extracted_text:
            result.qr_codes = self._detect_qr(img_array)
            return result

        # Fallback to Tesseract
        result = self._run_tesseract(img_array, start)
        result.qr_codes = self._detect_qr(img_array)
        return result

    def _run_easyocr(self, img_array, start_time) -> OCRResult:
        reader = self._get_easyocr()
        if not reader:
            return OCRResult()
        try:
            detections = reader.readtext(img_array)
            boxes = []
            texts = []
            confidences = []

            for (bbox, text, conf) in detections:
                if conf < 0.3:
                    continue
                pts = bbox
                x = int(min(p[0] for p in pts))
                y = int(min(p[1] for p in pts))
                w = int(max(p[0] for p in pts)) - x
                h = int(max(p[1] for p in pts)) - y
                boxes.append(BoundingBox(x=x, y=y, width=w, height=h, text=text, confidence=conf))
                texts.append(text)
                confidences.append(conf)

            avg_conf = sum(confidences) / len(confidences) if confidences else 0.0
            elapsed = (time.perf_counter() - start_time) * 1000

            return OCRResult(
                extracted_text=" ".join(texts),
                bounding_boxes=boxes,
                engine_used="easyocr",
                confidence=avg_conf,
                processing_time_ms=elapsed,
            )
        except Exception as e:
            logger.warning("easyocr_processing_error", error=str(e))
            return OCRResult()

    def _run_tesseract(self, img_array, start_time) -> OCRResult:
        try:
            import pytesseract
            from PIL import Image
            import numpy as np

            img = Image.fromarray(img_array)
            data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)

            texts = []
            boxes = []
            confidences = []

            for i, conf in enumerate(data["conf"]):
                if int(conf) < 30:
                    continue
                text = data["text"][i].strip()
                if not text:
                    continue
                texts.append(text)
                confidences.append(int(conf) / 100)
                boxes.append(BoundingBox(
                    x=data["left"][i],
                    y=data["top"][i],
                    width=data["width"][i],
                    height=data["height"][i],
                    text=text,
                    confidence=int(conf) / 100,
                ))

            avg_conf = sum(confidences) / len(confidences) if confidences else 0.0
            elapsed = (time.perf_counter() - start_time) * 1000

            return OCRResult(
                extracted_text=" ".join(texts),
                bounding_boxes=boxes,
                engine_used="tesseract",
                confidence=avg_conf,
                processing_time_ms=elapsed,
            )
        except Exception as e:
            logger.warning("tesseract_error", error=str(e))
            elapsed = (time.perf_counter() - start_time) * 1000
            return OCRResult(error=f"OCR failed: {e}", processing_time_ms=elapsed)

    def _detect_qr(self, img_array) -> list[str]:
        """Detect and decode QR codes using OpenCV."""
        try:
            import cv2
            detector = cv2.QRCodeDetector()
            data, _, _ = detector.detectAndDecode(img_array)
            return [data] if data else []
        except Exception:
            return []
