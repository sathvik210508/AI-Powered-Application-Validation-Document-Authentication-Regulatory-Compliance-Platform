import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from auth import get_current_user, require_roles
from services.validator import run_application_validation

router = APIRouter(prefix="/api/validation", tags=["validation"])

@router.post("/applications/{app_id}/run")
def trigger_validation(
    app_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    app = db.query(models.Application).filter(models.Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    findings = run_application_validation(app_id, db)

    db.add(models.AuditLog(
        actor_email=current_user.email,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        action="VALIDATION_RUN",
        application_id=app.id,
        details=f"User triggered automated validation. {len(findings)} findings generated. Current status: '{app.status}'."
    ))
    db.commit()

    return {
        "message": "Validation complete",
        "application_status": app.status,
        "findings_count": len(findings)
    }

@router.patch("/findings/{finding_id}", response_model=schemas.FindingResponse)
def update_finding_review(
    finding_id: int,
    data: schemas.FindingUpdate,
    current_user: models.User = Depends(require_roles(["reviewer", "admin"])),
    db: Session = Depends(get_db)
):
    finding = db.query(models.ValidationFinding).filter(models.ValidationFinding.id == finding_id).first()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")

    if data.status:
        finding.status = data.status
    if data.reviewer_comment is not None:
        finding.reviewer_comment = data.reviewer_comment
    if data.reviewer_decision:
        finding.reviewer_decision = data.reviewer_decision

    db.commit()
    db.refresh(finding)

    db.add(models.AuditLog(
        actor_email=current_user.email,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        action="FINDING_REVIEWED",
        application_id=finding.application_id,
        document_id=finding.document_id,
        details=f"Finding '{finding.rule_title}' marked as '{finding.status}' with decision '{finding.reviewer_decision}'."
    ))
    db.commit()

    return finding
