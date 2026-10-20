import os
import json
import datetime
from sqlalchemy.orm import Session
import models
from auth import hash_password
from services.processor import compute_sha256
from services.validator import run_application_validation
from services.compliance import evaluate_application_compliance, seed_default_compliance_rules
from services.verifier import verifier_service

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)

def create_sample_pdf(filename: str, title: str, institution: str, cert_no: str, dates: dict, extra_lines: list = None) -> str:
    """
    Creates a valid text-based PDF using ReportLab so pypdf and OCR can read it genuinely.
    """
    filepath = os.path.join(UPLOADS_DIR, filename)
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.pdfgen import canvas
        
        c = canvas.Canvas(filepath, pagesize=letter)
        c.setFont("Helvetica-Bold", 16)
        c.drawString(72, 720, "GOVERNMENT / REGULATORY STATUTORY RECORD")
        c.setFont("Helvetica", 12)
        c.drawString(72, 700, title.upper())
        c.line(72, 690, 540, 690)
        
        c.setFont("Helvetica-Bold", 11)
        c.drawString(72, 660, f"Certificate / Order No: {cert_no}")
        c.drawString(72, 640, f"Granted To: {institution}")
        
        y = 615
        if dates.get("issue_date"):
            c.drawString(72, y, f"Issue Date: {dates['issue_date']}")
            y -= 20
        if dates.get("expiry_date"):
            c.drawString(72, y, f"Valid Up To: {dates['expiry_date']}")
            y -= 20
            
        c.setFont("Helvetica", 10)
        c.drawString(72, y, "This official certificate certifies regulatory compliance under statutory guidelines.")
        y -= 25
        
        if extra_lines:
            for line in extra_lines:
                c.drawString(72, y, line)
                y -= 18
                
        c.setFont("Helvetica-Oblique", 9)
        c.drawString(72, 100, f"Issued by Competent Authority under Seal & Gazette Notification. Document Reference: {cert_no}")
        c.save()
    except Exception as e:
        # Fallback if reportlab fails
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(f"%PDF-1.4\n1 0 obj << /Title ({title}) /Subject ({cert_no}) >> endobj\n{title}\nInstitution: {institution}\nCertificate No: {cert_no}\n")
    return filepath

def seed_database(db: Session, force_reset: bool = False):
    """
    Seeds demo accounts, sample applications for Scenarios A-G, real sample PDFs,
    automated validation findings, simulated verification outcomes, and audit logs.
    """
    if force_reset:
        db.query(models.AuditLog).delete()
        db.query(models.ComplianceItem).delete()
        db.query(models.ComplianceRule).delete()
        db.query(models.VerificationRecord).delete()
        db.query(models.ValidationFinding).delete()
        db.query(models.Document).delete()
        db.query(models.Application).delete()
        db.query(models.User).delete()
        db.commit()

    # 1. Seed Users
    if db.query(models.User).count() == 0:
        users = [
            models.User(
                email="institution@demo.aicte.gov.in",
                password_hash=hash_password("Demo@123"),
                full_name="Dr. Ramesh Sharma (Principal)",
                role="institution",
                institution_name="Delhi Institute of Technology & Science"
            ),
            models.User(
                email="reviewer@aicte.gov.in",
                password_hash=hash_password("Reviewer@123"),
                full_name="Shri Alok Verma (Senior AICTE Officer)",
                role="reviewer",
                institution_name="AICTE Bureau of Approval (Northern Region)"
            ),
            models.User(
                email="admin@aicte.gov.in",
                password_hash=hash_password("Admin@123"),
                full_name="Prof. Sunita Rao (Director Approval Bureau)",
                role="admin",
                institution_name="AICTE Headquarters, New Delhi"
            )
        ]
        db.add_all(users)
        db.commit()

    seed_default_compliance_rules(db)

    # 2. Seed Demo Applications & Documents if none exist
    if db.query(models.Application).count() == 0:
        inst_user = db.query(models.User).filter(models.User.email == "institution@demo.aicte.gov.in").first()
        inst_user_id = inst_user.id if inst_user else None

        # --- SCENARIO A: Application with No Detected Issues ---
        app_a = models.Application(
            application_number="APP-2026-001",
            institution_name="Delhi Institute of Technology & Science",
            institution_code="AICTE-1-1002341",
            category="Extension of Approval (EoA)",
            academic_year="2026-2027",
            status="Checks Passed",
            faculty_count=52,
            student_intake=420,
            campus_area_sqm=25000.0,
            builtup_area_sqm=12500.0,
            programmes_json=json.dumps([
                {"name": "Computer Science & Engineering", "level": "UG", "intake": 180},
                {"name": "Electronics & Communication", "level": "UG", "intake": 120},
                {"name": "Mechanical Engineering", "level": "UG", "intake": 120}
            ]),
            submission_date=datetime.datetime(2026, 10, 5, 11, 30),
            created_by_id=inst_user_id,
            reviewer_notes="All documents in order. Preliminary automated checks and authority verification passed.",
            final_decision="Pending"
        )
        db.add(app_a)
        db.commit()
        db.refresh(app_a)

        # Create PDFs for Scenario A
        f1 = create_sample_pdf("app1_affiliation.pdf", "State University Affiliation Order", app_a.institution_name, "AFF-UNIV-2026/8942", {"issue_date": "15-May-2026", "expiry_date": "30-Jun-2027"}, ["Approved Total Intake: 420 Students across UG branches."])
        f2 = create_sample_pdf("app1_fire.pdf", "Fire Safety Clearance NOC", app_a.institution_name, "FIRE-NOC/DL/2026/041", {"issue_date": "10-Feb-2026", "expiry_date": "31-Mar-2028"}, ["Coverage: Academic Quadrangle Blocks A, B, C."])
        f3 = create_sample_pdf("app1_land.pdf", "Educational Land Title Certificate", app_a.institution_name, "LU-MUNC-88421", {"issue_date": "12-Jan-2025", "expiry_date": "31-Dec-2055"}, ["Total Area: 25000 sq.m contiguous campus."])
        f4 = create_sample_pdf("app1_bldg.pdf", "Building Safety & Occupancy Certificate", app_a.institution_name, "BLDG-OCC-9912", {"issue_date": "20-Mar-2025", "expiry_date": "20-Mar-2035"}, ["Structural safety certified for institutional use."])
        f5 = create_sample_pdf("app1_faculty.pdf", "Certified Faculty Roster", app_a.institution_name, "FAC-ROSTER-2026-A", {"issue_date": "01-Jul-2026"}, ["Total Faculty: 52 certified teaching members on roll."])

        docs_a = [
            ("Affiliation Certificate", "app1_affiliation.pdf", f1, "AFF-UNIV-2026/8942", {"institution_name": app_a.institution_name, "certificate_number": "AFF-UNIV-2026/8942", "expiry_date": "30-Jun-2027"}),
            ("Fire Safety NOC", "app1_fire.pdf", f2, "FIRE-NOC/DL/2026/041", {"institution_name": app_a.institution_name, "certificate_number": "FIRE-NOC/DL/2026/041", "expiry_date": "31-Mar-2028"}),
            ("Land Use Certificate", "app1_land.pdf", f3, "LU-MUNC-88421", {"institution_name": app_a.institution_name, "certificate_number": "LU-MUNC-88421", "area": "25000"}),
            ("Building Safety Certificate", "app1_bldg.pdf", f4, "BLDG-OCC-9912", {"institution_name": app_a.institution_name, "certificate_number": "BLDG-OCC-9912"}),
            ("Faculty Roster & Qualifications", "app1_faculty.pdf", f5, "FAC-ROSTER-2026-A", {"institution_name": app_a.institution_name, "faculty_count": 52})
        ]
        for dtype, fname, fpath, cno, fields in docs_a:
            d = models.Document(
                application_id=app_a.id,
                document_type=dtype,
                filename=fname,
                storage_name=fname,
                file_size=os.path.getsize(fpath),
                file_hash_sha256=compute_sha256(fpath),
                mime_type="application/pdf",
                page_count=1,
                status="Processed",
                ocr_confidence=0.98,
                ocr_text=f"Statutory Record: {dtype}\nInstitution: {app_a.institution_name}\nCertificate No: {cno}\nExtracted text valid.",
                extracted_fields_json=json.dumps(fields)
            )
            db.add(d)
            db.commit()
            db.refresh(d)
            
            # Simulated verification
            vstatus, vpayload, vsummary = verifier_service.verify_document(dtype, cno, app_a.institution_name)
            ver = models.VerificationRecord(
                application_id=app_a.id,
                document_id=d.id,
                issuing_authority=fields.get("issuing_authority", "Competent Statutory Authority"),
                verification_method="Automated API Adapter",
                status=vstatus,
                request_payload_json=json.dumps({"cert_no": cno, "app": app_a.application_number}),
                response_payload_json=json.dumps(vpayload),
                response_summary=vsummary,
                is_simulated=True
            )
            db.add(ver)

        db.commit()

        # --- SCENARIO B: Missing Document ---
        app_b = models.Application(
            application_number="APP-2026-002",
            institution_name="National Engineering Academy, Pune",
            institution_code="AICTE-1-1004512",
            category="Change in Approved Intake",
            academic_year="2026-2027",
            status="Deficiencies Found",
            faculty_count=35,
            student_intake=360,
            campus_area_sqm=18000.0,
            builtup_area_sqm=8200.0,
            submission_date=datetime.datetime(2026, 10, 8, 14, 15),
            created_by_id=inst_user_id
        )
        db.add(app_b)
        db.commit()
        db.refresh(app_b)

        # Upload only Affiliation and Faculty, omitting Building Safety Certificate
        fb1 = create_sample_pdf("app2_affiliation.pdf", "University Affiliation Order", app_b.institution_name, "AFF-PUNE-2026/112", {"issue_date": "10-Jun-2026", "expiry_date": "30-Jun-2027"})
        fb2 = create_sample_pdf("app2_faculty.pdf", "Faculty Staff Summary", app_b.institution_name, "FAC-PUNE-35", {"issue_date": "05-Jul-2026"}, ["Total Faculty: 35 members on roll."])
        
        for dtype, fname, fpath, cno, fields in [
            ("Affiliation Certificate", "app2_affiliation.pdf", fb1, "AFF-PUNE-2026/112", {"institution_name": app_b.institution_name, "certificate_number": "AFF-PUNE-2026/112", "expiry_date": "30-Jun-2027"}),
            ("Faculty Roster & Qualifications", "app2_faculty.pdf", fb2, "FAC-PUNE-35", {"institution_name": app_b.institution_name, "faculty_count": 35})
        ]:
            d = models.Document(
                application_id=app_b.id,
                document_type=dtype,
                filename=fname,
                storage_name=fname,
                file_size=os.path.getsize(fpath),
                file_hash_sha256=compute_sha256(fpath),
                mime_type="application/pdf",
                page_count=1,
                status="Processed",
                ocr_confidence=0.96,
                ocr_text=f"Record: {dtype}\nInstitution: {app_b.institution_name}\nCertificate No: {cno}",
                extracted_fields_json=json.dumps(fields)
            )
            db.add(d)
        db.commit()

        # --- SCENARIO C: Expired Certificate ---
        app_c = models.Application(
            application_number="APP-2026-003",
            institution_name="Apex Institute of Management & Research, Bengaluru",
            institution_code="AICTE-1-1008891",
            category="New Course Approval",
            academic_year="2026-2027",
            status="Deficiencies Found",
            faculty_count=24,
            student_intake=240,
            campus_area_sqm=14000.0,
            builtup_area_sqm=6500.0,
            submission_date=datetime.datetime(2026, 10, 11, 16, 45),
            created_by_id=inst_user_id
        )
        db.add(app_c)
        db.commit()
        db.refresh(app_c)

        fc1 = create_sample_pdf("app3_expired_aff.pdf", "State Affiliation Letter (Expired)", app_c.institution_name, "AFF-UNIV-2024/7711", {"issue_date": "10-Jun-2024", "expiry_date": "30-Jun-2025"}, ["Validity expired prior to active cycle."])
        fc2 = create_sample_pdf("app3_land.pdf", "Land Deed & Zoning Order", app_c.institution_name, "LU-BLR-5541", {"issue_date": "15-Aug-2023", "expiry_date": "15-Aug-2053"})
        fc3 = create_sample_pdf("app3_fire.pdf", "Fire Safety NOC", app_c.institution_name, "FIRE-BLR-2026/89", {"issue_date": "02-Jan-2026", "expiry_date": "31-Dec-2028"})
        fc4 = create_sample_pdf("app3_infra.pdf", "Classroom and Seminar Photos", app_c.institution_name, "PHOTO-LOG-2026", {"issue_date": "10-Aug-2026"})

        for dtype, fname, fpath, cno, fields in [
            ("Affiliation Certificate", "app3_expired_aff.pdf", fc1, "AFF-UNIV-2024/7711", {"institution_name": app_c.institution_name, "certificate_number": "AFF-UNIV-2024/7711", "expiry_date": "30-Jun-2025"}),
            ("Land Use Certificate", "app3_land.pdf", fc2, "LU-BLR-5541", {"institution_name": app_c.institution_name, "certificate_number": "LU-BLR-5541"}),
            ("Fire Safety NOC", "app3_fire.pdf", fc3, "FIRE-BLR-2026/89", {"institution_name": app_c.institution_name, "certificate_number": "FIRE-BLR-2026/89", "expiry_date": "31-Dec-2028"}),
            ("Infrastructure Layout & Photos", "app3_infra.pdf", fc4, "PHOTO-LOG-2026", {"institution_name": app_c.institution_name})
        ]:
            d = models.Document(
                application_id=app_c.id,
                document_type=dtype,
                filename=fname,
                storage_name=fname,
                file_size=os.path.getsize(fpath),
                file_hash_sha256=compute_sha256(fpath),
                mime_type="application/pdf",
                page_count=1,
                status="Processed",
                ocr_confidence=0.97,
                ocr_text=f"Document: {dtype}\nInstitution: {app_c.institution_name}\nCertificate No: {cno}\nValid Up To: {fields.get('expiry_date', '')}",
                extracted_fields_json=json.dumps(fields)
            )
            db.add(d)
            db.commit()
            db.refresh(d)
            
            # Run simulated verification
            vstatus, vpayload, vsummary = verifier_service.verify_document(dtype, cno, app_c.institution_name)
            db.add(models.VerificationRecord(
                application_id=app_c.id,
                document_id=d.id,
                issuing_authority="State Technical Affiliating Board",
                verification_method="Automated API Adapter",
                status=vstatus,
                request_payload_json=json.dumps({"cert_no": cno}),
                response_payload_json=json.dumps(vpayload),
                response_summary=vsummary
            ))
        db.commit()

        # --- SCENARIO D: Inconsistent Information (Faculty Mismatch & Name Inconsistency) ---
        app_d = models.Application(
            application_number="APP-2026-004",
            institution_name="Himalayan Polytechnic, Dehradun",
            institution_code="AICTE-1-1006623",
            category="Extension of Approval (EoA)",
            academic_year="2026-2027",
            status="Manual Review Required",
            faculty_count=48, # Application says 48, roster will say 42
            student_intake=360,
            campus_area_sqm=21000.0,
            builtup_area_sqm=9400.0,
            submission_date=datetime.datetime(2026, 10, 13, 10, 0),
            created_by_id=inst_user_id
        )
        db.add(app_d)
        db.commit()
        db.refresh(app_d)

        fd1 = create_sample_pdf("app4_affiliation.pdf", "State Board Affiliation Letter", "Himalaya Technical Institute", "AFF-UK-2026/410", {"issue_date": "20-May-2026", "expiry_date": "30-Jun-2027"}, ["Granted to: Himalaya Technical Institute (Slight name variance)."])
        fd2 = create_sample_pdf("app4_faculty_roster.pdf", "Approved Faculty List", app_d.institution_name, "ROSTER-UK-42", {"issue_date": "01-Jul-2026"}, ["Total Faculty: 42 certified faculty positions confirmed on roster."])
        fd3 = create_sample_pdf("app4_fire.pdf", "Fire Safety NOC", app_d.institution_name, "FIRE-UK-2026/19", {"issue_date": "10-Feb-2026", "expiry_date": "31-Mar-2028"})
        fd4 = create_sample_pdf("app4_land.pdf", "Land Title Clearance", app_d.institution_name, "LU-DDN-781", {"issue_date": "05-Aug-2024"})
        fd5 = create_sample_pdf("app4_bldg.pdf", "Building Safety Certificate", app_d.institution_name, "BLDG-UK-2025", {"issue_date": "15-Apr-2025"})

        for dtype, fname, fpath, cno, fields in [
            ("Affiliation Certificate", "app4_affiliation.pdf", fd1, "AFF-UK-2026/410", {"institution_name": "Himalaya Technical Institute", "certificate_number": "AFF-UK-2026/410", "expiry_date": "30-Jun-2027"}),
            ("Faculty Roster & Qualifications", "app4_faculty_roster.pdf", fd2, "ROSTER-UK-42", {"institution_name": app_d.institution_name, "faculty_count": 42}),
            ("Fire Safety NOC", "app4_fire.pdf", fd3, "FIRE-UK-2026/19", {"institution_name": app_d.institution_name, "expiry_date": "31-Mar-2028"}),
            ("Land Use Certificate", "app4_land.pdf", fd4, "LU-DDN-781", {"institution_name": app_d.institution_name}),
            ("Building Safety Certificate", "app4_bldg.pdf", fd5, "BLDG-UK-2025", {"institution_name": app_d.institution_name})
        ]:
            d = models.Document(
                application_id=app_d.id,
                document_type=dtype,
                filename=fname,
                storage_name=fname,
                file_size=os.path.getsize(fpath),
                file_hash_sha256=compute_sha256(fpath),
                mime_type="application/pdf",
                page_count=1,
                status="Processed",
                ocr_confidence=0.95,
                ocr_text=f"Document: {dtype}\nInstitution: {fields.get('institution_name', app_d.institution_name)}\nFaculty Count: {fields.get('faculty_count', '')}",
                extracted_fields_json=json.dumps(fields)
            )
            db.add(d)
        db.commit()

        # --- SCENARIO E: Potential Duplicate (Identical SHA-256) ---
        app_e = models.Application(
            application_number="APP-2026-005",
            institution_name="Vanguard Institute of Computer Applications, Hyderabad",
            institution_code="AICTE-1-1009102",
            category="Extension of Approval (EoA)",
            academic_year="2026-2027",
            status="Deficiencies Found",
            faculty_count=32,
            student_intake=240,
            campus_area_sqm=12000.0,
            builtup_area_sqm=5500.0,
            submission_date=datetime.datetime(2026, 10, 15, 12, 30),
            created_by_id=inst_user_id
        )
        db.add(app_e)
        db.commit()
        db.refresh(app_e)

        # Create one physical file and upload it twice under two different document types to create identical SHA-256!
        fe_duplicate = create_sample_pdf("vanguard_duplicate_cert.pdf", "General Municipal Clearance Certificate", app_e.institution_name, "GEN-MUNC-HYD-99", {"issue_date": "12-Mar-2026"}, ["Duplicate certificate body reused for multiple statutory clearance slots."])
        fe_aff = create_sample_pdf("vanguard_affiliation.pdf", "University Affiliation Letter", app_e.institution_name, "AFF-OU-2026/78", {"issue_date": "05-Jun-2026", "expiry_date": "30-Jun-2027"})
        fe_fac = create_sample_pdf("vanguard_faculty.pdf", "Faculty Staff Summary", app_e.institution_name, "FAC-HYD-32", {"issue_date": "01-Jul-2026"}, ["Total Faculty: 32"])
        fe_fire = create_sample_pdf("vanguard_fire.pdf", "Fire Safety NOC", app_e.institution_name, "FIRE-TG-2026/55", {"issue_date": "20-Jan-2026", "expiry_date": "31-Dec-2027"})

        docs_e = [
            ("Affiliation Certificate", "vanguard_affiliation.pdf", fe_aff, "AFF-OU-2026/78", {"institution_name": app_e.institution_name, "expiry_date": "30-Jun-2027"}),
            ("Faculty Roster & Qualifications", "vanguard_faculty.pdf", fe_fac, "FAC-HYD-32", {"institution_name": app_e.institution_name, "faculty_count": 32}),
            ("Fire Safety NOC", "vanguard_fire.pdf", fe_fire, "FIRE-TG-2026/55", {"institution_name": app_e.institution_name, "expiry_date": "31-Dec-2027"}),
            ("Land Use Certificate", "land_certificate_scanned.pdf", fe_duplicate, "GEN-MUNC-HYD-99", {"institution_name": app_e.institution_name, "certificate_number": "GEN-MUNC-HYD-99"}),
            ("Building Safety Certificate", "occupancy_clearance_scanned.pdf", fe_duplicate, "GEN-MUNC-HYD-99", {"institution_name": app_e.institution_name, "certificate_number": "GEN-MUNC-HYD-99"})
        ]
        for dtype, fname, fpath, cno, fields in docs_e:
            d = models.Document(
                application_id=app_e.id,
                document_type=dtype,
                filename=fname,
                storage_name=fname,
                file_size=os.path.getsize(fpath),
                file_hash_sha256=compute_sha256(fpath),
                mime_type="application/pdf",
                page_count=1,
                status="Processed",
                ocr_confidence=0.96,
                ocr_text=f"Statutory Record: {dtype}\nInstitution: {app_e.institution_name}\nCertificate No: {cno}",
                extracted_fields_json=json.dumps(fields)
            )
            db.add(d)
        db.commit()

        # --- SCENARIO F: Verification Mismatch (Simulated Official Source returns different details) ---
        app_f = models.Application(
            application_number="APP-2026-006",
            institution_name="Konkan Coast Engineering College, Ratnagiri",
            institution_code="AICTE-1-1007744",
            category="Programme Expansion",
            academic_year="2026-2027",
            status="Manual Review Required",
            faculty_count=38,
            student_intake=360, # Application claims 360, but authority record says 240
            campus_area_sqm=30000.0,
            builtup_area_sqm=11000.0,
            submission_date=datetime.datetime(2026, 10, 16, 11, 20),
            created_by_id=inst_user_id
        )
        db.add(app_f)
        db.commit()
        db.refresh(app_f)

        ff1 = create_sample_pdf("app6_affiliation.pdf", "State Technical University Affiliation Order", app_f.institution_name, "AFF-UNIV-2026/9021", {"issue_date": "25-May-2026", "expiry_date": "30-Jun-2027"}, ["Sanctioned Intake claimed: 360 Students."])
        ff2 = create_sample_pdf("app6_faculty.pdf", "Faculty Roster", app_f.institution_name, "FAC-RTN-38", {"issue_date": "01-Jul-2026"}, ["Total Faculty: 38"])
        ff3 = create_sample_pdf("app6_land.pdf", "Land Title Clearance", app_f.institution_name, "LU-RTN-120", {"issue_date": "10-Oct-2024"})
        ff4 = create_sample_pdf("app6_fire.pdf", "Fire Safety NOC", app_f.institution_name, "FIRE-RTN-2026/08", {"issue_date": "15-Mar-2026", "expiry_date": "31-Mar-2028"})

        for dtype, fname, fpath, cno, fields in [
            ("Affiliation Certificate", "app6_affiliation.pdf", ff1, "AFF-UNIV-2026/9021", {"institution_name": app_f.institution_name, "certificate_number": "AFF-UNIV-2026/9021", "expiry_date": "30-Jun-2027"}),
            ("Faculty Roster & Qualifications", "app6_faculty.pdf", ff2, "FAC-RTN-38", {"institution_name": app_f.institution_name, "faculty_count": 38}),
            ("Land Use Certificate", "app6_land.pdf", ff3, "LU-RTN-120", {"institution_name": app_f.institution_name}),
            ("Fire Safety NOC", "app6_fire.pdf", ff4, "FIRE-RTN-2026/08", {"institution_name": app_f.institution_name, "expiry_date": "31-Mar-2028"})
        ]:
            d = models.Document(
                application_id=app_f.id,
                document_type=dtype,
                filename=fname,
                storage_name=fname,
                file_size=os.path.getsize(fpath),
                file_hash_sha256=compute_sha256(fpath),
                mime_type="application/pdf",
                page_count=1,
                status="Processed",
                ocr_confidence=0.96,
                ocr_text=f"Document: {dtype}\nInstitution: {app_f.institution_name}\nCertificate No: {cno}",
                extracted_fields_json=json.dumps(fields)
            )
            db.add(d)
            db.commit()
            db.refresh(d)
            
            # Execute simulated verification
            vstatus, vpayload, vsummary = verifier_service.verify_document(dtype, cno, app_f.institution_name)
            db.add(models.VerificationRecord(
                application_id=app_f.id,
                document_id=d.id,
                issuing_authority="Maharashtra State Technical University",
                verification_method="Automated API Adapter",
                status=vstatus,
                request_payload_json=json.dumps({"cert_no": cno}),
                response_payload_json=json.dumps(vpayload),
                response_summary=vsummary
            ))
        db.commit()

        # --- SCENARIO G: Manual Review Required (Source Unavailable & Low OCR Confidence) ---
        app_g = models.Application(
            application_number="APP-2026-007",
            institution_name="Saraswati Technical Campus, Lucknow",
            institution_code="AICTE-1-1005521",
            category="Extension of Approval (EoA)",
            academic_year="2026-2027",
            status="Manual Review Required",
            faculty_count=45,
            student_intake=300,
            campus_area_sqm=20000.0,
            builtup_area_sqm=9000.0,
            submission_date=datetime.datetime(2026, 10, 18, 15, 10),
            created_by_id=inst_user_id
        )
        db.add(app_g)
        db.commit()
        db.refresh(app_g)

        fg1 = create_sample_pdf("app7_aff.pdf", "State University Affiliation Order", app_g.institution_name, "AFF-AKTU-2026/881", {"issue_date": "10-Jun-2026", "expiry_date": "30-Jun-2027"})
        fg2 = create_sample_pdf("app7_fire_unavailable.pdf", "State Fire Clearance Order", app_g.institution_name, "FIRE-NOC/MH/2025/112", {"issue_date": "15-Dec-2025", "expiry_date": "31-Dec-2028"})
        fg3 = create_sample_pdf("app7_land.pdf", "Land Revenue Certificate", app_g.institution_name, "LU-LKO-440", {"issue_date": "10-Jan-2024"})
        fg4 = create_sample_pdf("app7_bldg.pdf", "Building Safety Certificate", app_g.institution_name, "BLDG-LKO-2025", {"issue_date": "05-May-2025"})
        fg5 = create_sample_pdf("app7_faculty_low_ocr.pdf", "Faculty Service Book Records", app_g.institution_name, "UNKNOWN-FAC-ROSTER", {"issue_date": "01-Jul-2026"})

        docs_g = [
            ("Affiliation Certificate", "app7_aff.pdf", fg1, "AFF-AKTU-2026/881", {"institution_name": app_g.institution_name, "expiry_date": "30-Jun-2027"}, 0.95),
            ("Fire Safety NOC", "app7_fire_unavailable.pdf", fg2, "FIRE-NOC/MH/2025/112", {"institution_name": app_g.institution_name, "certificate_number": "FIRE-NOC/MH/2025/112"}, 0.92),
            ("Land Use Certificate", "app7_land.pdf", fg3, "LU-LKO-440", {"institution_name": app_g.institution_name}, 0.94),
            ("Building Safety Certificate", "app7_bldg.pdf", fg4, "BLDG-LKO-2025", {"institution_name": app_g.institution_name}, 0.93),
            ("Faculty Roster & Qualifications", "app7_faculty_low_ocr.pdf", fg5, "UNKNOWN-FAC-ROSTER", {"institution_name": app_g.institution_name}, 0.42) # Low OCR confidence
        ]
        for dtype, fname, fpath, cno, fields, conf in docs_g:
            d = models.Document(
                application_id=app_g.id,
                document_type=dtype,
                filename=fname,
                storage_name=fname,
                file_size=os.path.getsize(fpath),
                file_hash_sha256=compute_sha256(fpath),
                mime_type="application/pdf",
                page_count=1,
                status="Processed",
                ocr_confidence=conf,
                ocr_text=f"Document scan: {dtype}. Text density low. OCR Confidence: {conf}",
                extracted_fields_json=json.dumps(fields)
            )
            db.add(d)
            db.commit()
            db.refresh(d)
            
            # Simulated verification
            vstatus, vpayload, vsummary = verifier_service.verify_document(dtype, cno, app_g.institution_name)
            db.add(models.VerificationRecord(
                application_id=app_g.id,
                document_id=d.id,
                issuing_authority="State Directorate of Fire Services / University Board",
                verification_method="Automated API Adapter",
                status=vstatus,
                request_payload_json=json.dumps({"cert_no": cno}),
                response_payload_json=json.dumps(vpayload),
                response_summary=vsummary
            ))
        db.commit()

        # Run Validation Engine and Compliance Engine for all seeded applications
        for app_rec in [app_a, app_b, app_c, app_d, app_e, app_f, app_g]:
            run_application_validation(app_rec.id, db)
            evaluate_application_compliance(app_rec.id, db)

        # 3. Seed Audit Trail Logs
        audit_events = [
            models.AuditLog(
                actor_email="institution@demo.aicte.gov.in",
                actor_name="Dr. Ramesh Sharma",
                actor_role="institution",
                action="APPLICATION_CREATED",
                application_id=app_a.id,
                timestamp=datetime.datetime(2026, 10, 5, 9, 15),
                details="Extension of Approval application initiated by institutional authorized signatory.",
                ip_address="10.14.82.101"
            ),
            models.AuditLog(
                actor_email="institution@demo.aicte.gov.in",
                actor_name="Dr. Ramesh Sharma",
                actor_role="institution",
                action="DOCUMENT_UPLOADED",
                application_id=app_a.id,
                timestamp=datetime.datetime(2026, 10, 5, 10, 40),
                details="Uploaded Affiliation Certificate, Fire Safety NOC, Land Use Certificate, and Faculty Roster.",
                ip_address="10.14.82.101"
            ),
            models.AuditLog(
                actor_email="system@smartvalidate.aicte.gov.in",
                actor_name="AICTE Automated Engine",
                actor_role="system",
                action="AUTOMATED_VALIDATION_COMPLETED",
                application_id=app_a.id,
                timestamp=datetime.datetime(2026, 10, 5, 11, 35),
                previous_status="Submitted",
                new_status="Checks Passed",
                details="Executed 6 validation rules. 0 critical deficiencies, 0 warnings. Automated integrity checks satisfied.",
                ip_address="127.0.0.1"
            ),
            models.AuditLog(
                actor_email="reviewer@aicte.gov.in",
                actor_name="Shri Alok Verma",
                actor_role="reviewer",
                action="DOCUMENT_VERIFIED",
                application_id=app_a.id,
                timestamp=datetime.datetime(2026, 10, 6, 15, 20),
                details="Verified Affiliation Certificate with State Technological University live registry. Digital seal confirmed.",
                ip_address="10.8.2.14"
            ),
            models.AuditLog(
                actor_email="system@smartvalidate.aicte.gov.in",
                actor_name="AICTE Automated Engine",
                actor_role="system",
                action="ANOMALY_FLAGGED",
                application_id=app_e.id,
                timestamp=datetime.datetime(2026, 10, 15, 12, 35),
                previous_status="Submitted",
                new_status="Deficiencies Found",
                details="Exact SHA-256 binary hash collision detected between Land Use Certificate and Building Safety Certificate.",
                ip_address="127.0.0.1"
            ),
            models.AuditLog(
                actor_email="reviewer@aicte.gov.in",
                actor_name="Shri Alok Verma",
                actor_role="reviewer",
                action="RECTIFICATION_REQUESTED",
                application_id=app_b.id,
                timestamp=datetime.datetime(2026, 10, 9, 11, 10),
                details="Deficiency notice issued to National Engineering Academy, Pune regarding missing Fire Safety NOC.",
                ip_address="10.8.2.14"
            )
        ]
        db.add_all(audit_events)
        db.commit()
