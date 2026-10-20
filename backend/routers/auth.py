from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from auth import verify_password, create_access_token, get_current_user, hash_password

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/login", response_model=schemas.TokenResponse)
def login(creds: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == creds.email.lower().strip()).first()
    if not user or not verify_password(creds.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    token = create_access_token({
        "sub": user.email,
        "role": user.role,
        "name": user.full_name
    })

    return schemas.TokenResponse(
        access_token=token,
        token_type="bearer",
        user=schemas.UserResponse.from_orm(user)
    )

@router.get("/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(get_current_user)):
    return schemas.UserResponse.from_orm(current_user)

@router.post("/switch-demo-role/{role}", response_model=schemas.TokenResponse)
def switch_demo_role(role: str, db: Session = Depends(get_db)):
    """Convenient demo switcher for hackathon demonstration."""
    role_map = {
        "institution": "institution@demo.aicte.gov.in",
        "reviewer": "reviewer@aicte.gov.in",
        "admin": "admin@aicte.gov.in"
    }
    email = role_map.get(role.lower())
    if not email:
        raise HTTPException(status_code=400, detail=f"Invalid demo role. Choose from: {list(role_map.keys())}")
        
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Demo account not found")

    token = create_access_token({
        "sub": user.email,
        "role": user.role,
        "name": user.full_name
    })

    return schemas.TokenResponse(
        access_token=token,
        token_type="bearer",
        user=schemas.UserResponse.from_orm(user)
    )
