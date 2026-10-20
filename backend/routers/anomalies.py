from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
import models
from auth import get_current_user, require_roles
from services.anomaly import analyze_document_anomalies

router = APIRouter(prefix="/api/anomalies", tags=["anomalies"])

@router.get("")
def get_anomalies(
    application_id: Optional[int] = Query(None),
    min_score: Optional[int] = Query(1),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(models.Document)
    if application_id:
        query = query.filter(models.Document.application_id == application_id)
        
    docs = query.all()
    results = []
    
    for doc in docs:
        analysis = analyze_document_anomalies(doc, db)
        if analysis["anomaly_score"] >= (min_score or 0):
            app = doc.application
            results.append({
                **analysis,
                "application_id": doc.application_id,
                "application_number": app.application_number if app else "Unknown",
                "institution_name": app.institution_name if app else "Unknown",
                "uploaded_at": doc.uploaded_at,
                "download_url": f"/uploads/{doc.storage_name}"
            })

    # Sort descending by anomaly score
    results.sort(key=lambda x: x["anomaly_score"], reverse=True)
    return results

@router.post("/{doc_id}/decision")
def record_anomaly_decision(
    doc_id: int,
    payload: dict,
    current_user: models.User = Depends(require_roles(["reviewer", "admin"])),
    db: Session = Depends(get_db)
):
    doc = db.query(models.Document).filter(models.Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    decision = payload.get("decision", "Manual Review Completed")
    notes = payload.get("notes", "")

    db.add(models.AuditLog(
        actor_email=current_user.email,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        action="ANOMALY_REVIEWED",
        application_id=doc.application_id,
        document_id=doc.id,
        details=f"Reviewer reviewed potential anomaly signals for '{doc.filename}'. Decision: '{decision}'. Observations: {notes}."
    ))
    db.commit()

    return {"message": "Anomaly review decision recorded successfully"}
