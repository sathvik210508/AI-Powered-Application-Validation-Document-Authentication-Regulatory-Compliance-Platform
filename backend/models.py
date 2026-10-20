import datetime
from sqlalchemy import (
    Column, Integer, String, Text, DateTime, Boolean, Float, ForeignKey, JSON
)
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(120), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(120), nullable=False)
    role = Column(String(40), nullable=False) # institution, reviewer, admin
    institution_name = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    applications = relationship("Application", back_populates="created_by")

class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    application_number = Column(String(50), unique=True, index=True, nullable=False)
    institution_name = Column(String(255), nullable=False)
    institution_code = Column(String(50), nullable=False)
    category = Column(String(100), nullable=False) # Extension of Approval (EoA), Change in Approved Intake, etc.
    academic_year = Column(String(30), nullable=False, default="2026-2027")
    status = Column(String(50), nullable=False, default="Draft") 
    # Draft, Submitted, Checks Passed, Deficiencies Found, Verification Pending, Manual Review Required, Review Completed, Approved
    
    faculty_count = Column(Integer, default=0)
    student_intake = Column(Integer, default=0)
    campus_area_sqm = Column(Float, default=0.0)
    builtup_area_sqm = Column(Float, default=0.0)
    
    programmes_json = Column(Text, default="[]") # JSON list of courses & intake
    faculty_details_json = Column(Text, default="[]")
    infrastructure_details_json = Column(Text, default="{}")
    
    submission_date = Column(DateTime, nullable=True)
    last_updated = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewer_notes = Column(Text, default="")
    final_decision = Column(String(50), default="Pending") # Pending, Approved, Clarification Requested, Rejected

    created_by = relationship("User", back_populates="applications")
    documents = relationship("Document", back_populates="application", cascade="all, delete-orphan")
    findings = relationship("ValidationFinding", back_populates="application", cascade="all, delete-orphan")
    verifications = relationship("VerificationRecord", back_populates="application", cascade="all, delete-orphan")
    compliance_items = relationship("ComplianceItem", back_populates="application", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="application")

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False)
    document_type = Column(String(100), nullable=False)
    filename = Column(String(255), nullable=False)
    storage_name = Column(String(255), nullable=False)
    file_size = Column(Integer, default=0)
    file_hash_sha256 = Column(String(64), index=True, nullable=False)
    mime_type = Column(String(100), default="application/pdf")
    page_count = Column(Integer, default=1)
    status = Column(String(50), default="Uploaded") # Uploaded, Processed, Extraction Flagged, Replaced
    
    ocr_text = Column(Text, default="")
    extracted_fields_json = Column(Text, default="{}")
    ocr_confidence = Column(Float, default=1.0)
    
    is_duplicate = Column(Boolean, default=False)
    duplicate_of_id = Column(Integer, ForeignKey("documents.id"), nullable=True)
    
    is_manually_corrected = Column(Boolean, default=False)
    manual_corrections_json = Column(Text, default="{}")
    
    uploaded_at = Column(DateTime, default=datetime.datetime.utcnow)
    uploaded_by = Column(String(120), default="User")

    application = relationship("Application", back_populates="documents")
    findings = relationship("ValidationFinding", back_populates="document", cascade="all, delete-orphan")
    verifications = relationship("VerificationRecord", back_populates="document", cascade="all, delete-orphan")

class ValidationFinding(Base):
    __tablename__ = "validation_findings"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=True)
    
    rule_code = Column(String(50), nullable=False)
    rule_title = Column(String(200), nullable=False)
    severity = Column(String(20), nullable=False) # critical, warning, info
    status = Column(String(30), default="open") # open, reviewed, resolved, waived
    
    explanation = Column(Text, nullable=False)
    evidence_data_json = Column(Text, default="{}")
    page_reference = Column(String(50), default="1")
    detected_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    reviewer_comment = Column(Text, default="")
    reviewer_decision = Column(String(50), default="Pending Review")
    recommended_action = Column(Text, default="")

    application = relationship("Application", back_populates="findings")
    document = relationship("Document", back_populates="findings")

class VerificationRecord(Base):
    __tablename__ = "verification_records"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    
    issuing_authority = Column(String(150), nullable=False)
    verification_method = Column(String(100), default="Automated API Adapter")
    status = Column(String(50), default="Verification Pending")
    # Verified, Mismatch Detected, Expired, Verification Pending, Source Unavailable, Manual Review Required
    
    request_time = Column(DateTime, default=datetime.datetime.utcnow)
    response_time = Column(DateTime, nullable=True)
    request_payload_json = Column(Text, default="{}")
    response_payload_json = Column(Text, default="{}")
    response_summary = Column(Text, default="")
    is_simulated = Column(Boolean, default=True)
    reviewer_notes = Column(Text, default="")

    application = relationship("Application", back_populates="verifications")
    document = relationship("Document", back_populates="verifications")

class ComplianceItem(Base):
    __tablename__ = "compliance_items"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False)
    rule_id = Column(Integer, ForeignKey("compliance_rules.id"), nullable=True)
    
    requirement_title = Column(String(200), nullable=False)
    category = Column(String(100), nullable=False)
    status = Column(String(50), default="Evidence Present")
    # Evidence Present, Requirement Check Passed, Deficiency Detected, Insufficient Evidence, Manual Inspection Required
    
    submitted_evidence = Column(Text, default="")
    missing_info = Column(Text, default="")
    reviewer_comments = Column(Text, default="")
    recommended_action = Column(Text, default="")

    application = relationship("Application", back_populates="compliance_items")
    rule = relationship("ComplianceRule", back_populates="items")

class ComplianceRule(Base):
    __tablename__ = "compliance_rules"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(100), nullable=False)
    required_evidence = Column(Text, nullable=False)
    validation_conditions = Column(Text, default="")
    effective_version = Column(String(50), default="AICTE APH 2026-27")
    is_active = Column(Boolean, default=True)

    items = relationship("ComplianceItem", back_populates="rule")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    actor_email = Column(String(120), nullable=False)
    actor_name = Column(String(120), nullable=False)
    actor_role = Column(String(50), nullable=False)
    action = Column(String(80), nullable=False)
    
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=True)
    document_id = Column(Integer, nullable=True)
    
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    previous_status = Column(String(50), nullable=True)
    new_status = Column(String(50), nullable=True)
    details = Column(Text, default="")
    ip_address = Column(String(50), default="127.0.0.1")

    application = relationship("Application", back_populates="audit_logs")
