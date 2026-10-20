import hashlib
import hmac
import json
import base64
import time
from typing import Optional, List
from fastapi import Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from database import get_db
import models

SECRET_KEY = "aicte-smartvalidate-demo-secret-key-production-ready"

def hash_password(password: str) -> str:
    salt = "aicte_salt_2026"
    pwd_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
    return pwd_hash.hex()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return hash_password(plain_password) == hashed_password

def create_access_token(data: dict, expires_in_seconds: int = 86400) -> str:
    payload = data.copy()
    payload["exp"] = int(time.time()) + expires_in_seconds
    raw_json = json.dumps(payload, separators=(',', ':'), sort_keys=True).encode('utf-8')
    b64_payload = base64.urlsafe_b64encode(raw_json).decode('utf-8').rstrip('=')
    
    signature = hmac.new(SECRET_KEY.encode('utf-8'), b64_payload.encode('utf-8'), hashlib.sha256).hexdigest()
    return f"{b64_payload}.{signature}"

def decode_access_token(token: str) -> Optional[dict]:
    try:
        parts = token.split('.')
        if len(parts) != 2:
            return None
        b64_payload, signature = parts
        expected_sig = hmac.new(SECRET_KEY.encode('utf-8'), b64_payload.encode('utf-8'), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected_sig):
            return None
        
        # Add padding back if necessary
        padding = '=' * (4 - len(b64_payload) % 4)
        raw_json = base64.urlsafe_b64decode(b64_payload + padding).decode('utf-8')
        payload = json.loads(raw_json)
        
        if payload.get("exp", 0) < int(time.time()):
            return None
        return payload
    except Exception:
        return None

def get_current_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> models.User:
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = authorization
    if authorization.startswith("Bearer "):
        token = authorization[7:]
    
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = db.query(models.User).filter(models.User.email == payload["sub"]).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user

def require_roles(allowed_roles: List[str]):
    def role_checker(current_user: models.User = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: requires one of {allowed_roles} roles. Your role is '{current_user.role}'."
            )
        return current_user
    return role_checker
