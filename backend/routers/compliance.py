from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from auth import get_current_user, require_roles
from services.compliance import evaluate_application_compliance

router = APIRouter(prefix="/api/compliance", tags=["compliance"])

@router.get("/rules", response_model=List[dict])
def get_compliance_rules(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    rules = db.query(models.ComplianceRule).all()
    return [
        {
            "id": r.id,
            "code": r.code,
            "name": r.name,
            "description": r.description,
            "category": r.category,
            "required_evidence": r.required_evidence,
            "validation_conditions": r.validation_conditions,
            "effective_version": r.effective_version,
            "is_active": r.is_active
        }
        for r in rules
    ]

@router.post("/rules")
def create_compliance_rule(
    rule_data: schemas.ComplianceRuleCreate,
    current_user: models.User = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db)
):
    existing = db.query(models.ComplianceRule).filter(models.ComplianceRule.code == rule_data.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Rule code already exists")

    rule = models.ComplianceRule(**rule_data.dict())
    db.add(rule)
    db.commit()
    db.refresh(rule)

    db.add(models.AuditLog(
        actor_email=current_user.email,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        action="COMPLIANCE_RULE_CREATED",
        details=f"Admin created compliance rule {rule.code}: {rule.name}."
    ))
    db.commit()

    return {"message": "Rule created successfully", "id": rule.id}

@router.put("/rules/{id}")
def update_compliance_rule(
    id: int,
    payload: dict,
    current_user: models.User = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db)
):
    rule = db.query(models.ComplianceRule).filter(models.ComplianceRule.id == id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")

    for k, v in payload.items():
        if hasattr(rule, k):
            setattr(rule, k, v)

    db.commit()

    db.add(models.AuditLog(
        actor_email=current_user.email,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        action="COMPLIANCE_RULE_UPDATED",
        details=f"Admin updated compliance rule {rule.code}."
    ))
    db.commit()

    return {"message": "Rule updated successfully"}

@router.get("/applications/{app_id}")
def get_application_compliance(
    app_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    items = db.query(models.ComplianceItem).filter(models.ComplianceItem.application_id == app_id).all()
    if not items:
        # Evaluate on the fly if not evaluated yet
        items = evaluate_application_compliance(app_id, db)

    return [
        {
            "id": item.id,
            "application_id": item.application_id,
            "rule_id": item.rule_id,
            "requirement_title": item.requirement_title,
            "category": item.category,
            "status": item.status,
            "submitted_evidence": item.submitted_evidence,
            "missing_info": item.missing_info,
            "reviewer_comments": item.reviewer_comments,
            "recommended_action": item.recommended_action
        }
        for item in items
    ]

@router.patch("/items/{id}")
def update_compliance_item(
    id: int,
    payload: dict,
    current_user: models.User = Depends(require_roles(["reviewer", "admin"])),
    db: Session = Depends(get_db)
):
    item = db.query(models.ComplianceItem).filter(models.ComplianceItem.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Compliance item not found")

    if "status" in payload:
        item.status = payload["status"]
    if "reviewer_comments" in payload:
        item.reviewer_comments = payload["reviewer_comments"]
    if "recommended_action" in payload:
        item.recommended_action = payload["recommended_action"]

    db.commit()

    db.add(models.AuditLog(
        actor_email=current_user.email,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        action="COMPLIANCE_ITEM_REVIEWED",
        application_id=item.application_id,
        details=f"Compliance item '{item.requirement_title}' updated to '{item.status}'."
    ))
    db.commit()

    return {"message": "Compliance item updated successfully"}
