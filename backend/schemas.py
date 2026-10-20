from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class UserBase(BaseModel):
    email: str
    full_name: str
    role: str
    institution_name: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(UserBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class ApplicationBase(BaseModel):
    institution_name: str
    institution_code: str
    category: str
    academic_year: str = "2026-2027"
    faculty_count: int = 0
    student_intake: int = 0
    campus_area_sqm: float = 0.0
    builtup_area_sqm: float = 0.0
    programmes_json: Optional[str] = "[]"
    faculty_details_json: Optional[str] = "[]"
    infrastructure_details_json: Optional[str] = "{}"

class ApplicationCreate(ApplicationBase):
    pass

class ApplicationUpdate(BaseModel):
    institution_name: Optional[str] = None
    institution_code: Optional[str] = None
    category: Optional[str] = None
    academic_year: Optional[str] = None
    faculty_count: Optional[int] = None
    student_intake: Optional[int] = None
    campus_area_sqm: Optional[float] = None
    builtup_area_sqm: Optional[float] = None
    programmes_json: Optional[str] = None
    faculty_details_json: Optional[str] = None
    infrastructure_details_json: Optional[str] = None
    status: Optional[str] = None
    reviewer_notes: Optional[str] = None
    final_decision: Optional[str] = None

class DocumentResponse(BaseModel):
    id: int
    application_id: int
    document_type: str
    filename: str
    storage_name: str
    file_size: int
    file_hash_sha256: str
    mime_type: str
    page_count: int
    status: str
    ocr_confidence: float
    is_duplicate: bool
    duplicate_of_id: Optional[int] = None
    is_manually_corrected: bool
    extracted_fields_json: str
    uploaded_at: datetime
    uploaded_by: str
    class Config:
        from_attributes = True

class FindingResponse(BaseModel):
    id: int
    application_id: int
    document_id: Optional[int] = None
    rule_code: str
    rule_title: str
    severity: str
    status: str
    explanation: str
    evidence_data_json: str
    page_reference: str
    detected_at: datetime
    reviewer_comment: str
    reviewer_decision: str
    recommended_action: str
    class Config:
        from_attributes = True

class FindingUpdate(BaseModel):
    status: Optional[str] = None
    reviewer_comment: Optional[str] = None
    reviewer_decision: Optional[str] = None

class VerificationResponse(BaseModel):
    id: int
    application_id: int
    document_id: int
    issuing_authority: str
    verification_method: str
    status: str
    request_time: datetime
    response_time: Optional[datetime] = None
    request_payload_json: str
    response_payload_json: str
    response_summary: str
    is_simulated: bool
    reviewer_notes: str
    document_type: Optional[str] = None
    filename: Optional[str] = None
    class Config:
        from_attributes = True

class ComplianceItemResponse(BaseModel):
    id: int
    application_id: int
    rule_id: Optional[int] = None
    requirement_title: str
    category: str
    status: str
    submitted_evidence: str
    missing_info: str
    reviewer_comments: str
    recommended_action: str
    class Config:
        from_attributes = True

class ComplianceRuleCreate(BaseModel):
    code: str
    name: str
    description: str
    category: str
    required_evidence: str
    validation_conditions: Optional[str] = ""
    effective_version: Optional[str] = "AICTE APH 2026-27"
    is_active: bool = True

class AuditLogResponse(BaseModel):
    id: int
    actor_email: str
    actor_name: str
    actor_role: str
    action: str
    application_id: Optional[int] = None
    document_id: Optional[int] = None
    timestamp: datetime
    previous_status: Optional[str] = None
    new_status: Optional[str] = None
    details: str
    ip_address: str
    class Config:
        from_attributes = True

class ApplicationResponse(ApplicationBase):
    id: int
    application_number: str
    status: str
    submission_date: Optional[datetime] = None
    last_updated: datetime
    created_by_id: Optional[int] = None
    reviewer_notes: str
    final_decision: str
    documents: List[DocumentResponse] = []
    findings: List[FindingResponse] = []
    verifications: List[VerificationResponse] = []
    compliance_items: List[ComplianceItemResponse] = []
    class Config:
        from_attributes = True
