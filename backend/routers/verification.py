import json
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from auth import get_current_user, require_roles
from services.verifier import verifier_service

router = APIRouter(prefix="/api/verification", tags=["verification"])

@router.get("", response_model=List[dict])
def list_verifications(
    status: Optional[str] = Query(None),
    application_id: Optional[int] = Query(None),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(models.VerificationRecord)

    if application_id:
        query = query.filter(models.VerificationRecord.application_id == application_id)
    if status and status != "All":
        query = query.filter(models.VerificationRecord.status == status)

    records = query.order_by(models.VerificationRecord.request_time.desc()).all()
    results = []
    for r in records:
        doc = r.document
        app = r.application
        results.append({
            "id": r.id,
            "application_id": r.application_id,
            "application_number": app.application_number if app else "Unknown",
            "institution_name": app.institution_name if app else "Unknown",
            "document_id": r.document_id,
            "document_type": doc.document_type if doc else "Document",
            "filename": doc.filename if doc else "N/A",
            "issuing_authority": r.issuing_authority,
            "verification_method": r.verification_method,
            "status": r.status,
            "request_time": r.request_time,
            "response_time": r.response_time,
            "request_payload": json.loads(r.request_payload_json or "{}"),
            "response_payload": json.loads(r.response_payload_json or "{}"),
            "response_summary": r.response_summary,
            "is_simulated": r.is_simulated,
            "reviewer_notes": r.reviewer_notes
        })
    return results

@router.post("/{id}/verify")
def run_verification(
    id: int,
    current_user: models.User = Depends(require_roles(["reviewer", "admin"])),
    db: Session = Depends(get_db)
):
    rec = db.query(models.VerificationRecord).filter(models.VerificationRecord.id == id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Verification record not found")

    doc = rec.document
    app = rec.application

    cert_no = ""
    if doc and doc.extracted_fields_json:
        try:
            fields = json.loads(doc.extracted_fields_json)
            cert_no = fields.get("certificate_number", "")
        except Exception:
            pass

    # Call simulated verification adapter
    rec.request_time = datetime.datetime.utcnow()
    vstatus, vpayload, vsummary = verifier_service.verify_document(
        doc.document_type if doc else "Certificate",
        cert_no,
        app.institution_name if app else ""
    )
    
    rec.status = vstatus
    rec.response_time = datetime.datetime.utcnow()
    rec.response_payload_json = json.dumps(vpayload)
    rec.response_summary = vsummary
    db.commit()

    db.add(models.AuditLog(
        actor_email=current_user.email,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        action="DOCUMENT_VERIFIED",
        application_id=rec.application_id,
        document_id=rec.document_id,
        details=f"Verification executed for {doc.document_type if doc else 'Document'}. Status: {vstatus}. {vsummary}"
    ))
    db.commit()

    return {
        "id": rec.id,
        "status": rec.status,
        "response_summary": rec.response_summary,
        "response_payload": vpayload,
        "response_time": rec.response_time
    }

@router.patch("/{id}/notes")
def update_verification_notes(
    id: int,
    payload: dict,
    current_user: models.User = Depends(require_roles(["reviewer", "admin"])),
    db: Session = Depends(get_db)
):
    rec = db.query(models.VerificationRecord).filter(models.VerificationRecord.id == id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Verification record not found")

    rec.reviewer_notes = payload.get("reviewer_notes", "")
    db.commit()
    return {"message": "Verification notes updated successfully", "reviewer_notes": rec.reviewer_notes}
