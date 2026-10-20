from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models
from auth import get_current_user, require_roles
from services.seed import seed_database
from services.processor import PYTESSERACT_AVAILABLE

router = APIRouter(prefix="/api/settings", tags=["settings"])

@router.get("")
def get_system_settings(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    rules_count = db.query(models.ComplianceRule).filter(models.ComplianceRule.is_active == True).count()
    app_count = db.query(models.Application).count()
    doc_count = db.query(models.Document).count()

    return {
        "environment": "Demo / Evaluation Sandbox",
        "academic_cycle": "2026-2027",
        "ocr_engine": "Tesseract 5.5 + pypdf Text Extractor" if PYTESSERACT_AVAILABLE else "pypdf Pure Python Extractor",
        "ocr_available": PYTESSERACT_AVAILABLE,
        "verification_mode": "Simulated Authority Sandbox (Deterministic)",
        "active_compliance_rules": rules_count,
        "total_persisted_applications": app_count,
        "total_persisted_documents": doc_count,
        "authority_adapters": [
            {"name": "State Technological University Portal", "type": "REST API Adapter", "status": "Simulated Online"},
            {"name": "Directorate of Fire & Emergency Services", "type": "e-Clearance Gateway", "status": "Simulated Online"},
            {"name": "Municipal Town Planning Authority", "type": "GIS / Land Register", "status": "Simulated Online"},
            {"name": "National Academic Depository (NAD / DigiLocker)", "type": "OAuth 2.0 PKI", "status": "Simulated Standby"}
        ],
        "notice": "All data generated in this session represents fictional institutional entities for SIH hackathon demonstration."
    }

@router.post("/reset-demo")
def reset_demo_data(
    payload: dict,
    current_user: models.User = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db)
):
    if not payload.get("confirm", False):
        raise HTTPException(status_code=400, detail="Confirmation required to reset demo records")

    seed_database(db, force_reset=True)

    db.add(models.AuditLog(
        actor_email=current_user.email,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        action="SYSTEM_RESET",
        details="Administrator executed full demo data reset. Reseeded Scenarios A through G."
    ))
    db.commit()

    return {"message": "Demo data successfully reset and re-seeded with scenarios A through G."}
