import json
import re
import datetime
from typing import List, Dict, Any
from sqlalchemy.orm import Session
import models

# Category requirement mapping
REQUIRED_DOCUMENTS_BY_CATEGORY = {
    "Extension of Approval (EoA)": [
        "Affiliation Certificate",
        "Fire Safety NOC",
        "Land Use Certificate",
        "Building Safety Certificate",
        "Faculty Roster & Qualifications"
    ],
    "Change in Approved Intake": [
        "Affiliation Certificate",
        "Faculty Roster & Qualifications",
        "Building Safety Certificate",
        "Infrastructure Layout & Photos"
    ],
    "New Course Approval": [
        "Affiliation Certificate",
        "Land Use Certificate",
        "Fire Safety NOC",
        "Infrastructure Layout & Photos"
    ],
    "Programme Expansion": [
        "Affiliation Certificate",
        "Faculty Roster & Qualifications",
        "Land Use Certificate",
        "Fire Safety NOC"
    ]
}

def normalize_text(text: str) -> str:
    """Normalizes string for fuzzy comparison."""
    if not text:
        return ""
    # Remove common words and punctuation
    cleaned = re.sub(r'[^a-zA-Z0-9\s]', ' ', text.lower())
    stop_words = {"institute", "institution", "college", "of", "and", "&", "technology", "sciences", "science", "the", "engineering"}
    tokens = [w for w in cleaned.split() if w not in stop_words and len(w) > 2]
    return " ".join(sorted(tokens))

def run_application_validation(app_id: int, db: Session) -> List[models.ValidationFinding]:
    """
    Executes automated validation rules against an application and its supporting documents.
    Purges previous open findings and generates fresh evidence-linked records.
    """
    app = db.query(models.Application).filter(models.Application.id == app_id).first()
    if not app:
        return []

    # Clear old open findings for clean recalculation
    db.query(models.ValidationFinding).filter(
        models.ValidationFinding.application_id == app_id,
        models.ValidationFinding.status == "open"
    ).delete()

    new_findings: List[models.ValidationFinding] = []
    docs = app.documents
    doc_types_present = {d.document_type: d for d in docs}

    # 1. RULE-DOC-MISSING: Check Required Documents
    required_types = REQUIRED_DOCUMENTS_BY_CATEGORY.get(app.category, REQUIRED_DOCUMENTS_BY_CATEGORY["Extension of Approval (EoA)"])
    for req_type in required_types:
        if req_type not in doc_types_present:
            finding = models.ValidationFinding(
                application_id=app.id,
                document_id=None,
                rule_code="RULE-DOC-MISSING",
                rule_title=f"Mandatory Document Missing: {req_type}",
                severity="critical",
                status="open",
                explanation=f"The regulatory category '{app.category}' requires submission of a valid '{req_type}'. No file has been uploaded for this checklist requirement.",
                evidence_data_json=json.dumps({
                    "required_document": req_type,
                    "application_category": app.category,
                    "documents_found": list(doc_types_present.keys())
                }),
                page_reference="N/A",
                recommended_action=f"Upload the approved {req_type} via the Documents tab before final submission."
            )
            new_findings.append(finding)

    # Inspect each uploaded document
    for doc in docs:
        extracted = {}
        if doc.extracted_fields_json:
            try:
                extracted = json.loads(doc.extracted_fields_json)
            except Exception:
                pass

        # 2. RULE-DUP-005: Duplicate Document Check
        same_hash_docs = db.query(models.Document).filter(
            models.Document.file_hash_sha256 == doc.file_hash_sha256,
            models.Document.id != doc.id
        ).all()
        if same_hash_docs:
            dup_filenames = [d.filename for d in same_hash_docs]
            finding = models.ValidationFinding(
                application_id=app.id,
                document_id=doc.id,
                rule_code="RULE-DUP-005",
                rule_title=f"Duplicate File Detected: {doc.filename}",
                severity="critical",
                status="open",
                explanation=f"Uploaded file '{doc.filename}' ({doc.document_type}) has an identical binary SHA-256 checksum to file(s): {', '.join(dup_filenames)}. Duplicate uploads for distinct statutory categories require clarification.",
                evidence_data_json=json.dumps({
                    "sha256": doc.file_hash_sha256,
                    "duplicate_with": dup_filenames
                }),
                page_reference="All Pages",
                recommended_action="Replace the duplicate file with the distinct certified copy for this statutory requirement."
            )
            new_findings.append(finding)

        # 3. RULE-EXP-001: Certificate Expiry Check
        expiry_date_str = extracted.get("expiry_date")
        if expiry_date_str:
            # Look for 4 digit year
            match_year = re.search(r'\b(20\d\d)\b', expiry_date_str)
            if match_year:
                year = int(match_year.group(1))
                # Current Academic Year review is 2026-2027
                if year < 2026:
                    finding = models.ValidationFinding(
                        application_id=app.id,
                        document_id=doc.id,
                        rule_code="RULE-EXP-001",
                        rule_title=f"Expired Certificate: {doc.document_type}",
                        severity="critical",
                        status="open",
                        explanation=f"The extracted validity date ({expiry_date_str}) in '{doc.filename}' expired prior to the AY 2026-27 approval cycle. AICTE regulations mandate valid clearance for the requested academic period.",
                        evidence_data_json=json.dumps({
                            "extracted_expiry_date": expiry_date_str,
                            "current_approval_cycle": "2026-2027",
                            "document_type": doc.document_type
                        }),
                        page_reference="Page 1",
                        recommended_action="Submit the official renewal certificate or current validity extension order issued by the competent authority."
                    )
                    new_findings.append(finding)

        # 4. RULE-NAME-002: Institution Name Consistency Check
        doc_inst_name = extracted.get("institution_name")
        if doc_inst_name and len(doc_inst_name.strip()) > 3:
            norm_app_name = normalize_text(app.institution_name)
            norm_doc_name = normalize_text(doc_inst_name)
            
            # Simple token overlap check
            app_tokens = set(norm_app_name.split())
            doc_tokens = set(norm_doc_name.split())
            
            if app_tokens and doc_tokens:
                overlap = app_tokens.intersection(doc_tokens)
                similarity = len(overlap) / max(len(app_tokens), len(doc_tokens))
                if similarity < 0.50 and "Trust" not in doc_inst_name and "Society" not in doc_inst_name:
                    finding = models.ValidationFinding(
                        application_id=app.id,
                        document_id=doc.id,
                        rule_code="RULE-NAME-002",
                        rule_title="Institution Name Inconsistency",
                        severity="warning",
                        status="open",
                        explanation=f"Discrepancy detected between institutional name declared in application ('{app.institution_name}') and name extracted from {doc.document_type} ('{doc_inst_name}').",
                        evidence_data_json=json.dumps({
                            "application_name": app.institution_name,
                            "document_extracted_name": doc_inst_name,
                            "similarity_score": round(similarity, 2)
                        }),
                        page_reference="Page 1",
                        recommended_action="Verify if the document was issued under an earlier institutional name or sponsoring trust/society, and provide supporting gazette notification if applicable."
                    )
                    new_findings.append(finding)

        # 5. RULE-FAC-003: Faculty Count Inconsistency Check
        doc_faculty_count = extracted.get("faculty_count")
        if doc_faculty_count is not None and app.faculty_count > 0:
            if abs(int(doc_faculty_count) - app.faculty_count) > 0:
                finding = models.ValidationFinding(
                    application_id=app.id,
                    document_id=doc.id,
                    rule_code="RULE-FAC-003",
                    rule_title="Faculty Roster Count Mismatch",
                    severity="warning",
                    status="open",
                    explanation=f"Faculty strength mismatch: Application form declares {app.faculty_count} faculty members, but the extracted roster document lists {doc_faculty_count} certified teaching positions.",
                    evidence_data_json=json.dumps({
                        "declared_faculty_count": app.faculty_count,
                        "roster_extracted_count": int(doc_faculty_count),
                        "difference": app.faculty_count - int(doc_faculty_count)
                    }),
                    page_reference="Summary Page",
                    recommended_action="Reconcile the faculty roster with form figures to reflect exact regular and adjunct faculty on roll."
                )
                new_findings.append(finding)

        # 6. RULE-OCR-006: Low Confidence / Legibility Check
        if doc.ocr_confidence < 0.65:
            finding = models.ValidationFinding(
                application_id=app.id,
                document_id=doc.id,
                rule_code="RULE-OCR-006",
                rule_title=f"Low OCR Confidence on {doc.document_type}",
                severity="info",
                status="open",
                explanation=f"Document '{doc.filename}' yielded low extraction confidence ({round(doc.ocr_confidence * 100, 1)}%). The scan may contain skewed text, watermark interference, or low DPI.",
                evidence_data_json=json.dumps({
                    "confidence": round(doc.ocr_confidence, 2),
                    "filename": doc.filename
                }),
                page_reference="1",
                recommended_action="Review the extracted text preview manually or upload a higher resolution PDF scan (300 DPI recommended)."
            )
            new_findings.append(finding)

    # Add all new findings to database
    for f in new_findings:
        db.add(f)
    db.commit()

    # Update Application Overall Status based on findings
    critical_count = sum(1 for f in new_findings if f.severity == "critical")
    warning_count = sum(1 for f in new_findings if f.severity == "warning")
    
    # Check verification status
    verifs = app.verifications
    verif_pending = any(v.status == "Verification Pending" for v in verifs)
    verif_mismatch = any(v.status in ["Mismatch Detected", "Source Unavailable"] for v in verifs)

    if critical_count > 0:
        app.status = "Deficiencies Found"
    elif verif_mismatch:
        app.status = "Manual Review Required"
    elif verif_pending:
        app.status = "Verification Pending"
    elif warning_count > 0:
        app.status = "Manual Review Required"
    else:
        app.status = "Checks Passed"

    db.commit()
    db.refresh(app)
    return new_findings
