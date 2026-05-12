"""SQLAlchemy ORM models for SafeShare AI."""

import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import (
    Boolean, Column, DateTime, Float, ForeignKey,
    Integer, JSON, String, Text, Enum as SAEnum
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


def utcnow():
    return datetime.now(timezone.utc)


class Organization(Base):
    __tablename__ = "organizations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    domain = Column(String(255), unique=True)
    plan = Column(String(50), default="enterprise")
    is_active = Column(Boolean, default=True)
    settings = Column(JSON, default={})
    created_at = Column(DateTime(timezone=True), default=utcnow)

    users = relationship("User", back_populates="organization")
    policies = relationship("Policy", back_populates="organization")
    scans = relationship("ThreatScan", back_populates="organization")


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255))
    role = Column(SAEnum("admin", "analyst", "employee", name="user_role"), default="employee")
    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    last_login = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=utcnow)

    organization = relationship("Organization", back_populates="users")
    scans = relationship("ThreatScan", back_populates="user")
    audit_logs = relationship("AuditLog", back_populates="user")


class ThreatScan(Base):
    __tablename__ = "threat_scans"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=True)
    scan_type = Column(String(50), nullable=False)  # text, image, url, live
    status = Column(String(50), default="pending")  # pending, processing, completed, failed
    risk_score = Column(Float, default=0.0)
    risk_level = Column(String(20), default="safe")  # safe, low, medium, high, critical
    input_hash = Column(String(64))  # SHA-256 of input for dedup
    input_preview = Column(Text)
    scan_duration_ms = Column(Integer)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    completed_at = Column(DateTime(timezone=True))

    user = relationship("User", back_populates="scans")
    organization = relationship("Organization", back_populates="scans")
    report = relationship("ThreatReport", back_populates="scan", uselist=False)
    ocr_result = relationship("OCRResult", back_populates="scan", uselist=False)
    url_analysis = relationship("URLAnalysis", back_populates="scan", uselist=False)


class ThreatReport(Base):
    __tablename__ = "threat_reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scan_id = Column(UUID(as_uuid=True), ForeignKey("threat_scans.id"), nullable=False)
    pii_detections = Column(JSON, default=[])
    credential_detections = Column(JSON, default=[])
    anomaly_scores = Column(JSON, default={})
    nlp_entities = Column(JSON, default=[])
    risk_breakdown = Column(JSON, default={})
    ai_explanation = Column(Text)
    model_confidence = Column(Float, default=0.0)
    detection_pipeline = Column(JSON, default=[])
    created_at = Column(DateTime(timezone=True), default=utcnow)

    scan = relationship("ThreatScan", back_populates="report")


class OCRResult(Base):
    __tablename__ = "ocr_results"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scan_id = Column(UUID(as_uuid=True), ForeignKey("threat_scans.id"), nullable=False)
    extracted_text = Column(Text)
    ocr_engine = Column(String(50))  # easyocr, tesseract
    confidence = Column(Float)
    bounding_boxes = Column(JSON, default=[])
    sensitive_regions = Column(JSON, default=[])
    qr_codes_found = Column(JSON, default=[])
    processing_time_ms = Column(Integer)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    scan = relationship("ThreatScan", back_populates="ocr_result")


class URLAnalysis(Base):
    __tablename__ = "url_analyses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scan_id = Column(UUID(as_uuid=True), ForeignKey("threat_scans.id"), nullable=False)
    url = Column(Text, nullable=False)
    domain = Column(String(255))
    is_phishing = Column(Boolean, default=False)
    is_malicious = Column(Boolean, default=False)
    entropy_score = Column(Float)
    ssl_valid = Column(Boolean)
    domain_age_days = Column(Integer)
    redirect_chain = Column(JSON, default=[])
    threat_indicators = Column(JSON, default=[])
    ml_score = Column(Float)
    heuristic_score = Column(Float)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    scan = relationship("ThreatScan", back_populates="url_analysis")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False)
    resource_type = Column(String(50))
    resource_id = Column(String(255))
    ip_address = Column(String(45))
    user_agent = Column(Text)
    metadata = Column(JSON, default={})
    created_at = Column(DateTime(timezone=True), default=utcnow)

    user = relationship("User", back_populates="audit_logs")


class Policy(Base):
    __tablename__ = "policies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    rules = Column(JSON, default=[])
    is_active = Column(Boolean, default=True)
    severity_override = Column(String(20))
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    organization = relationship("Organization", back_populates="policies")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text)
    notification_type = Column(String(50))
    is_read = Column(Boolean, default=False)
    metadata = Column(JSON, default={})
    created_at = Column(DateTime(timezone=True), default=utcnow)
