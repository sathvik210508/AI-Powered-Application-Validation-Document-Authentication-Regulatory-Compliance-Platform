from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from auth import get_current_user

router = APIRouter(prefix="/api/audit", tags=["audit"])

@router.get("", response_model=List[schemas.AuditLogResponse])
def get_audit_trail(
    actor_role: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    application_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    limit: Optional[int] = Query(100),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(models.AuditLog)

    if actor_role and actor_role != "All":
        query = query.filter(models.AuditLog.actor_role == actor_role)
    if action and action != "All":
        query = query.filter(models.AuditLog.action == action)
    if application_id:
        query = query.filter(models.AuditLog.application_id == application_id)
    if search:
        search_fmt = f"%{search.strip()}%"
        query = query.filter(
            (models.AuditLog.details.ilike(search_fmt)) |
            (models.AuditLog.actor_name.ilike(search_fmt)) |
            (models.AuditLog.actor_email.ilike(search_fmt))
        )

    logs = query.order_by(models.AuditLog.timestamp.desc()).limit(limit).all()
    return logs
