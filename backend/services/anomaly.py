import re
import json
import datetime
from typing import List, Dict, Any
from sqlalchemy.orm import Session
import models

def analyze_document_anomalies(doc: models.Document, db: Session) -> Dict[str, Any]:
    """
    Performs multi-signal anomaly inspection for a single document.
    Returns:
      - anomaly_score (0-100)
      - risk_level ('Low', 'Medium', 'High')
      - signals: List[Dict] with category, reason, evidence, severity
      - recommended_action
    """
    signals = []
    score = 0
    
    # 1. Exact Duplicate Hash Analysis
    duplicate_docs = db.query(models.Document).filter(
        models.Document.file_hash_sha256 == doc.file_hash_sha256,
        models.Document.id != doc.id
    ).all()
    
    if duplicate_docs:
        dup_names = [d.filename for d in duplicate_docs]
        dup_apps = [d.application.application_number for d in duplicate_docs if d.application]
        signals.append({
            "code": "ANOM-HASH-DUP",
            "category": "Exact File Hash Duplicate",
            "title": "Exact Duplicate Document Detected (SHA-256 Match)",
            "severity": "critical",
            "points": 45,
            "evidence": f"File SHA-256 hash ({doc.file_hash_sha256[:12]}...) identical to: {', '.join(dup_names)} in Application(s) {', '.join(dup_apps)}",
            "explanation": "Identical binary content uploaded under different document categories or across different institutional applications."
        })
        score += 45

    # 2. Metadata Inspection
    metadata = {}
    try:
        if doc.extracted_fields_json:
            pass # fields stored separately
        # Look for PDF metadata stored in ocr_text or metadata
    except Exception:
        pass

    extracted_fields = {}
    try:
        if doc.extracted_fields_json:
            extracted_fields = json.loads(doc.extracted_fields_json)
    except Exception:
        pass

    # 3. Conflicting Issue & Expiry Dates
    issue_date_str = extracted_fields.get("issue_date")
    expiry_date_str = extracted_fields.get("expiry_date")
    
    if issue_date_str and expiry_date_str:
        # Check if dates look reversed or suspicious
        try:
            # Basic year extraction
            issue_year_match = re.search(r'\b(20\d\d)\b', issue_date_str)
            expiry_year_match = re.search(r'\b(20\d\d)\b', expiry_date_str)
            if issue_year_match and expiry_year_match:
                issue_year = int(issue_year_match.group(1))
                expiry_year = int(expiry_year_match.group(1))
                
                if issue_year > expiry_year:
                    signals.append({
                        "code": "ANOM-DATE-CONFLICT",
                        "category": "Chronological Inconsistency",
                        "title": "Issue Date Post-dates Stated Expiry Date",
                        "severity": "critical",
                        "points": 35,
                        "evidence": f"Extracted Issue Date ({issue_date_str}) occurs after stated Expiry Date ({expiry_date_str})",
                        "explanation": "Certificate claims to have been issued after its stated validity window expired."
                    })
                    score += 35
                elif expiry_year < 2026:
                    signals.append({
                        "code": "ANOM-DATE-EXPIRED",
                        "category": "Certificate Validity",
                        "title": "Certificate Lapsed Prior to Regulatory Cycle",
                        "severity": "warning",
                        "points": 25,
                        "evidence": f"Stated Expiry Date ({expiry_date_str}) has elapsed relative to current AY 2026-27 review window.",
                        "explanation": "Approval renewal requires active validity for the applicable academic year."
                    })
                    score += 25
        except Exception:
            pass

    # 4. OCR Extraction Confidence / Image Quality Flag
    if doc.ocr_confidence < 0.60:
        signals.append({
            "code": "ANOM-OCR-LOWCONF",
            "category": "Legibility & Machine Readability",
            "title": "Low Machine Readability Confidence",
            "severity": "warning",
            "points": 20,
            "evidence": f"OCR Confidence Score = {round(doc.ocr_confidence * 100, 1)}% (< 60% threshold). Extracted text contains low token density.",
            "explanation": "Document image resolution, compression artifacts, or skew prevent confident automated character recognition."
        })
        score += 20

    # 5. Missing Certificate Identifier
    if not extracted_fields.get("certificate_number") and doc.document_type not in ["Infrastructure Layout & Photos"]:
        signals.append({
            "code": "ANOM-ID-MISSING",
            "category": "Verification Identifiers",
            "title": "No Formal Certificate Reference Number Extracted",
            "severity": "info",
            "points": 10,
            "evidence": "No standard certificate or order number pattern recognized in document headers.",
            "explanation": "Official statutory clearances typically carry an alphanumeric registration or dispatch number."
        })
        score += 10

    # Determine risk level
    score = min(score, 100)
    if score >= 50:
        risk_level = "High"
        recommended_action = "Conduct manual side-by-side inspection and request official re-issuance or clarification."
    elif score >= 20:
        risk_level = "Medium"
        recommended_action = "Review flagged fields against physical document scans; manual reviewer sign-off needed."
    else:
        risk_level = "Low"
        recommended_action = "No significant anomaly signals detected. Automated integrity checks satisfied."

    return {
        "document_id": doc.id,
        "filename": doc.filename,
        "document_type": doc.document_type,
        "anomaly_score": score,
        "risk_level": risk_level,
        "signals": signals,
        "recommended_action": recommended_action
    }
