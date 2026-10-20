import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database import engine, SessionLocal, Base
import models
from services.seed import seed_database, UPLOADS_DIR

# Import all routers
from routers import (
    auth,
    applications,
    documents,
    validation,
    verification,
    compliance,
    anomalies,
    reports,
    audit,
    settings
)

# Initialize database schema
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AICTE SmartValidate API",
    description="AI-Powered Application Validation, Document Authentication & Regulatory Compliance Platform",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount uploads static directory
os.makedirs(UPLOADS_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

# Include Routers
app.include_router(auth.router)
app.include_router(applications.router)
app.include_router(documents.router)
app.include_router(validation.router)
app.include_router(verification.router)
app.include_router(compliance.router)
app.include_router(anomalies.router)
app.include_router(reports.router)
app.include_router(audit.router)
app.include_router(settings.router)

@app.on_event("startup")
def startup_event():
    # Seed database with demo accounts and Scenarios A-G
    db = SessionLocal()
    try:
        seed_database(db, force_reset=False)
    finally:
        db.close()

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "AICTE SmartValidate Engine",
        "version": "1.0.0",
        "environment": "Demo / Evaluation Sandbox"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
