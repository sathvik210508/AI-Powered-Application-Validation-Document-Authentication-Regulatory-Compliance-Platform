import io
import csv
import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from auth import get_current_user, require_roles
from services.validator import run_application_validation
from services.compliance import evaluate_application_compliance

router = APIRouter(prefix="/api/applications", tags=["applications"])

@router.get("", response_model=List[schemas.ApplicationResponse])
def get_applications(
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    academic_year: Optional[str] = Query(None),
    sort_by: Optional[str] = Query("last_updated"),
    order: Optional[str] = Query("desc"),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(models.Application)

    # Institution users only see their own applications if not admin/reviewer
    if current_user.role == "institution":
        query = query.filter(
            (models.Application.created_by_id == current_user.id) | 
            (models.Application.institution_name == current_user.institution_name)
        )

    if search:
        search_fmt = f"%{search.strip()}%"
        query = query.filter(
            (models.Application.application_number.ilike(search_fmt)) |
            (models.Application.institution_name.ilike(search_fmt)) |
            (models.Application.institution_code.ilike(search_fmt))
        )

    if category and category != "All":
        query = query.filter(models.Application.category == category)

    if status and status != "All":
        query = query.filter(models.Application.status == status)

    if academic_year and academic_year != "All":
        query = query.filter(models.Application.academic_year == academic_year)

    # Sorting
    sort_col = getattr(models.Application, sort_by, models.Application.last_updated)
    if order == "desc":
        query = query.order_by(sort_col.desc())
    else:
        query = query.order_by(sort_col.asc())

    return query.all()

@router.get("/export/csv")
def export_applications_csv(
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(models.Application)
    if current_user.role == "institution":
        query = query.filter(models.Application.created_by_id == current_user.id)
    if category and category != "All":
        query = query.filter(models.Application.category == category)
    if status and status != "All":
        query = query.filter(models.Application.status == status)

    apps = query.all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Application ID", "Institution Name", "Institution Code", "Category", 
        "Academic Year", "Status", "Faculty Count", "Student Intake", 
        "Campus Area (sqm)", "Submission Date", "Final Decision"
    ])

    for a in apps:
        writer.writerow([
            a.application_number,
            a.institution_name,
            a.institution_code,
            a.category,
            a.academic_year,
            a.status,
            a.faculty_count,
            a.student_intake,
            a.campus_area_sqm,
            a.submission_date.strftime("%Y-%m-%d %H:%M") if a.submission_date else "Draft",
            a.final_decision
        ])

    output.seek(0)
    filename = f"aicte_applications_export_{datetime.datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode('utf-8')),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/{id}", response_model=schemas.ApplicationResponse)
def get_application(
    id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    app = db.query(models.Application).filter(models.Application.id == id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    if current_user.role == "institution" and app.created_by_id != current_user.id and app.institution_name != current_user.institution_name:
        raise HTTPException(status_code=403, detail="Access denied to this application dossier")

    return app

@router.post("", response_model=schemas.ApplicationResponse)
def create_application(
    data: schemas.ApplicationCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Auto-generate next Application Number
    count = db.query(models.Application).count() + 1
    app_number = f"APP-2026-{count:03d}"
    
    app = models.Application(
        application_number=app_number,
        institution_name=data.institution_name,
        institution_code=data.institution_code,
        category=data.category,
        academic_year=data.academic_year,
        status="Draft",
        faculty_count=data.faculty_count,
        student_intake=data.student_intake,
        campus_area_sqm=data.campus_area_sqm,
        builtup_area_sqm=data.builtup_area_sqm,
        programmes_json=data.programmes_json,
        faculty_details_json=data.faculty_details_json,
        infrastructure_details_json=data.infrastructure_details_json,
        created_by_id=current_user.id
    )
    db.add(app)
    db.commit()
    db.refresh(app)

    # Audit log
    db.add(models.AuditLog(
        actor_email=current_user.email,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        action="APPLICATION_CREATED",
        application_id=app.id,
        details=f"Created application {app.application_number} under category {app.category}."
    ))
    db.commit()

    return app

@router.put("/{id}", response_model=schemas.ApplicationResponse)
def update_application(
    id: int,
    data: schemas.ApplicationUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    app = db.query(models.Application).filter(models.Application.id == id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    for field, val in data.dict(exclude_unset=True).items():
        setattr(app, field, val)

    app.last_updated = datetime.datetime.utcnow()
    db.commit()
    db.refresh(app)

    db.add(models.AuditLog(
        actor_email=current_user.email,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        action="APPLICATION_UPDATED",
        application_id=app.id,
        details=f"Updated application parameters: {list(data.dict(exclude_unset=True).keys())}."
    ))
    db.commit()

    return app

@router.post("/{id}/submit", response_model=schemas.ApplicationResponse)
def submit_application(
    id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    app = db.query(models.Application).filter(models.Application.id == id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    app.submission_date = datetime.datetime.utcnow()
    app.status = "Submitted"
    db.commit()

    # Trigger Automated Validation & Regulatory Compliance engines
    run_application_validation(app.id, db)
    evaluate_application_compliance(app.id, db)

    db.add(models.AuditLog(
        actor_email=current_user.email,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        action="APPLICATION_SUBMITTED",
        application_id=app.id,
        previous_status="Draft",
        new_status=app.status,
        details=f"Submitted application {app.application_number}. Automated validation pipeline initiated."
    ))
    db.commit()
    db.refresh(app)
    return app

@router.post("/{id}/decision", response_model=schemas.ApplicationResponse)
def record_decision(
    id: int,
    payload: dict,
    current_user: models.User = Depends(require_roles(["reviewer", "admin"])),
    db: Session = Depends(get_db)
):
    app = db.query(models.Application).filter(models.Application.id == id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    decision = payload.get("decision")
    notes = payload.get("notes", "")
    if not decision:
        raise HTTPException(status_code=400, detail="Decision parameter required")

    prev_decision = app.final_decision
    app.final_decision = decision
    app.reviewer_notes = notes
    if decision == "Approved":
        app.status = "Approved"
    elif decision == "Clarification Requested":
        app.status = "Manual Review Required"
    elif decision == "Deficiency Notice Issued":
        app.status = "Deficiencies Found"
    
    db.commit()

    db.add(models.AuditLog(
        actor_email=current_user.email,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        action="DECISION_RECORDED",
        application_id=app.id,
        previous_status=prev_decision,
        new_status=decision,
        details=f"Official AICTE decision marked as '{decision}'. Reviewer Remarks: {notes}."
    ))
    db.commit()
    db.refresh(app)
    return app

@router.delete("/{id}")
def delete_application(
    id: int,
    current_user: models.User = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db)
):
    app = db.query(models.Application).filter(models.Application.id == id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    app_num = app.application_number
    db.delete(app)
    db.commit()

    db.add(models.AuditLog(
        actor_email=current_user.email,
        actor_name=current_user.full_name,
        actor_role=current_user.role,
        action="APPLICATION_DELETED",
        application_id=None,
        details=f"Administrator deleted application record {app_num}."
    ))
    db.commit()
    return {"message": f"Application {app_num} deleted successfully"}
