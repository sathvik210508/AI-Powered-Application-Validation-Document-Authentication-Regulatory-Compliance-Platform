import os
import uuid
import json
import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from auth import get_current_user
from services.processor import process_uploaded_document
from services.validator import run_application_validation
from services.compliance import evaluate_application_compliance
from services.verifier import verifier_service

router = APIRouter(prefix="/api", tags=["documents"])

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg"}
MAX_FILE_SIZE = 15 * 1024 * 1024 # 15 MB

@router.post("/applications/{app_id}/documents", response_model=schemas.DocumentResponse)
async def upload_document(
    app_id: int,
    document_type: str = Form(...),
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    app = db.query(models.Application).filter(models.Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Allowed formats: PDF, PNG, JPEG."
        )

    # Secure unique storage name
    unique_storage_name = f"{uuid.uuid4().hex}_{file.filename}"
    save_path = os.path.join(UPLOADS_DIR, unique_storage_name)

    # Write file stream securely
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File exceeds maximum allowed size of 15MB."
        )
    with open(save_path, "wb") as f:
        f.write(content)

    # Execute automated document processing pipeline
    proc_result = process_uploaded_document(save_path, document_type)

    # Check for duplicate files in database
    dup_doc = db.query(models.Document).filter(
        models.Document.file_hash_sha256 == proc_result["file_hash"]
    ).first()

    is_duplicate = dup_doc is not None
    duplicate_of_id = dup_doc.id if dup_doc else None

    # Create Document record
    doc = models.Document(
        application_id=app.id,
        document_type=document_type,
        filename=file.filename,
        storage_name=unique_storage_name,
        file_size=proc_result["file_size"],
        file_hash_sha256=proc_result["file_hash"],
        mime_type=proc_result["mime_type"],
        page_count=proc_result["page_count"],
        status="Processed",
        ocr_text=proc_result["ocr_text"],
        extracted_fields_json=json.dumps(proc_result["extracted_fields"]),
        ocr_confidence=proc_result["confidence"],
        is_duplicate=is_duplicate,
        duplicate_of_id=duplicate_of_id,
        uploaded_by=current_user.full_name
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # If certificate number was extracted, automatically prepare verification record
    cert_no = proc_result["extracted_fields"].get("certificate_number", "")
    vstatus, vpayload, vsummary = verifier_service.verify_document(document_type, cert_no, app.institution_name)
    ver = models.VerificationRecord(
        application_id=app.id,
        document_id=doc.id,
        issuing_authority=proc_result["extracted_fields"].get("issuing_authority", "Competent Statutory Authority"),
        verification_method="Automated API Adapter",
        status=vstatus,
        request_payload_json=json.dumps({"cert_no": cert_no, "source": "upload_pipeline"}),
        response_payload_json=json.dumps(vpayload),
        response_summary=vsummary,
        is_simulated=True
    )
    db.add(ver)
    db.commit()

    # Re-run automated validation and compliance evaluation
    run_application_validation(app.id, db)
    evaluate_application_compliance(app.id, db)

    # Log audit event
    db.add(models.AuditLog(
        actor_email=current_user.email,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        action="DOCUMENT_UPLOADED",
        application_id=app.id,
        document_id=doc.id,
        details=f"Uploaded '{file.filename}' for '{document_type}'. SHA-256: {proc_result['file_hash'][:12]}... Extracted confidence: {proc_result['confidence']}."
    ))
    db.commit()

    return doc

@router.get("/documents/{id}")
def get_document(
    id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doc = db.query(models.Document).filter(models.Document.id == id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    extracted_fields = {}
    if doc.extracted_fields_json:
        try:
            extracted_fields = json.loads(doc.extracted_fields_json)
        except Exception:
            pass

    return {
        "id": doc.id,
        "application_id": doc.application_id,
        "document_type": doc.document_type,
        "filename": doc.filename,
        "storage_name": doc.storage_name,
        "file_size": doc.file_size,
        "file_hash_sha256": doc.file_hash_sha256,
        "mime_type": doc.mime_type,
        "page_count": doc.page_count,
        "status": doc.status,
        "ocr_confidence": doc.ocr_confidence,
        "is_duplicate": doc.is_duplicate,
        "duplicate_of_id": doc.duplicate_of_id,
        "is_manually_corrected": doc.is_manually_corrected,
        "manual_corrections": json.loads(doc.manual_corrections_json or "{}"),
        "ocr_text": doc.ocr_text,
        "extracted_fields": extracted_fields,
        "uploaded_at": doc.uploaded_at,
        "uploaded_by": doc.uploaded_by,
        "download_url": f"/uploads/{doc.storage_name}"
    }

@router.put("/documents/{id}/corrections")
def update_manual_corrections(
    id: int,
    corrections: dict,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doc = db.query(models.Document).filter(models.Document.id == id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    existing_fields = {}
    if doc.extracted_fields_json:
        try:
            existing_fields = json.loads(doc.extracted_fields_json)
        except Exception:
            pass

    # Merge corrections into extracted fields
    existing_fields.update(corrections)
    doc.extracted_fields_json = json.dumps(existing_fields)
    doc.is_manually_corrected = True
    doc.manual_corrections_json = json.dumps(corrections)
    db.commit()

    # Re-run validation
    run_application_validation(doc.application_id, db)
    evaluate_application_compliance(doc.application_id, db)

    db.add(models.AuditLog(
        actor_email=current_user.email,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        action="EXTRACTION_CORRECTED",
        application_id=doc.application_id,
        document_id=doc.id,
        details=f"Authorized user updated extracted fields: {list(corrections.keys())}."
    ))
    db.commit()

    return {"message": "Document corrections saved successfully", "extracted_fields": existing_fields}

@router.delete("/documents/{id}")
def delete_document(
    id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doc = db.query(models.Document).filter(models.Document.id == id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    app_id = doc.application_id
    fname = doc.filename
    storage = doc.storage_name

    # Remove file from disk if present
    file_path = os.path.join(UPLOADS_DIR, storage)
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception:
            pass

    db.delete(doc)
    db.commit()

    # Re-evaluate validation
    run_application_validation(app_id, db)
    evaluate_application_compliance(app_id, db)

    db.add(models.AuditLog(
        actor_email=current_user.email,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        action="DOCUMENT_REMOVED",
        application_id=app_id,
        document_id=None,
        details=f"Document '{fname}' removed from application dossier."
    ))
    db.commit()

    return {"message": f"Document '{fname}' deleted successfully"}
