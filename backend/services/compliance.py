import json
from typing import List, Dict, Any
from sqlalchemy.orm import Session
import models

DEFAULT_RULES = [
    {
        "code": "COMP-FSR-01",
        "name": "Cadre Ratio & Faculty-Student Ratio (FSR)",
        "description": "Institutions must maintain an overall Faculty to Student Ratio of 1:20 for undergraduate technical programmes with prescribed Professor : Associate Professor : Assistant Professor cadre ratio.",
        "category": "Faculty Norms",
        "required_evidence": "Certified Faculty Roster & University Selection Committee Minutes",
        "validation_conditions": json.dumps({"min_fsr_ratio": 20.0}),
        "effective_version": "AICTE APH 2026-27 Section 7.1"
    },
    {
        "code": "COMP-LAND-02",
        "name": "Continuous Land Ownership & Land Use Certificate",
        "description": "Institution must possess contiguous, encumbrance-free title or registered long lease (30+ years) for the minimum prescribed acreage in designated institutional/educational zoning.",
        "category": "Land & Building Norms",
        "required_evidence": "Registered Sale/Lease Deed and Sub-Divisional Magistrate Land Use Certificate",
        "validation_conditions": json.dumps({"min_campus_sqm": 10000}),
        "effective_version": "AICTE APH 2026-27 Section 6.2"
    },
    {
        "code": "COMP-FIRE-03",
        "name": "Fire Safety NOC & Life Safety Code Adherence",
        "description": "Unconditional Fire Safety Clearance Certificate from the competent State Fire & Rescue Services Directorate covering all operational academic, laboratory, and residential blocks.",
        "category": "Safety & Clearances",
        "required_evidence": "Directorate of Fire Services NOC (Active validity)",
        "validation_conditions": json.dumps({"mandatory_document": "Fire Safety NOC"}),
        "effective_version": "AICTE APH 2026-27 Section 6.8"
    },
    {
        "code": "COMP-BUILT-04",
        "name": "Adequacy of Instructional & Administrative Built-up Area",
        "description": "Total built-up area must satisfy prescribed square meters per approved student intake including smart classrooms, workshop bays, specialized labs, seminar halls, and amenities.",
        "category": "Infrastructure",
        "required_evidence": "Competent Town Planner Approved Master Building Layout & Occupancy Certificate",
        "validation_conditions": json.dumps({"min_sqm_per_student": 4.5}),
        "effective_version": "AICTE APH 2026-27 Section 6.5"
    },
    {
        "code": "COMP-LAB-05",
        "name": "Computing Infrastructure & High-Speed Bandwidth",
        "description": "Minimum 1 desktop computer per 4 students with licensed/open-source system software and dedicated high-speed optical fiber connectivity (>= 100 Mbps).",
        "category": "Digital Infrastructure",
        "required_evidence": "Asset Register Invoices and ISP Leased-Line Certificate",
        "validation_conditions": json.dumps({"computer_ratio": 4.0, "min_mbps": 100}),
        "effective_version": "AICTE APH 2026-27 Section 7.4"
    },
    {
        "code": "COMP-BARRIER-06",
        "name": "Barrier-Free Environment & Divyangjan Amenities",
        "description": "Universal accessibility provisions including gradient ramps, dedicated elevators with braille indicators, and disabled-friendly restrooms across instructional floors.",
        "category": "Barrier-Free Access",
        "required_evidence": "Architectural Compliance Certificate & Geo-tagged Photographs",
        "validation_conditions": json.dumps({"ramps_required": True, "lift_required": True}),
        "effective_version": "AICTE APH 2026-27 Section 6.11"
    }
]

def seed_default_compliance_rules(db: Session):
    for r in DEFAULT_RULES:
        existing = db.query(models.ComplianceRule).filter(models.ComplianceRule.code == r["code"]).first()
        if not existing:
            rule = models.ComplianceRule(
                code=r["code"],
                name=r["name"],
                description=r["description"],
                category=r["category"],
                required_evidence=r["required_evidence"],
                validation_conditions=r["validation_conditions"],
                effective_version=r["effective_version"],
                is_active=True
            )
            db.add(rule)
    db.commit()

def evaluate_application_compliance(app_id: int, db: Session) -> List[models.ComplianceItem]:
    """
    Evaluates regulatory compliance checklist items against application data.
    """
    app = db.query(models.Application).filter(models.Application.id == app_id).first()
    if not app:
        return []

    # Ensure default rules exist
    seed_default_compliance_rules(db)
    rules = db.query(models.ComplianceRule).filter(models.ComplianceRule.is_active == True).all()
    
    # Remove existing items to re-evaluate cleanly
    db.query(models.ComplianceItem).filter(models.ComplianceItem.application_id == app_id).delete()

    items = []
    doc_types = {d.document_type: d for d in app.documents}

    for rule in rules:
        status = "Requirement Check Passed"
        submitted_evidence = ""
        missing_info = ""
        recommended_action = ""
        reviewer_comments = ""

        if rule.code == "COMP-FSR-01":
            if app.faculty_count > 0 and app.student_intake > 0:
                ratio = round(app.student_intake / app.faculty_count, 1)
                submitted_evidence = f"Declared Faculty: {app.faculty_count}, Student Intake: {app.student_intake}. Computed Ratio: 1:{ratio}."
                if ratio > 20.0:
                    status = "Deficiency Detected"
                    missing_info = f"Current FSR 1:{ratio} breaches regulatory ceiling of 1:20."
                    recommended_action = f"Recruit additional certified faculty to reach 1:20 ratio."
                else:
                    status = "Requirement Check Passed"
                    recommended_action = "Maintain active faculty service books."
            else:
                status = "Insufficient Evidence"
                missing_info = "Faculty or Student Intake details not fully populated in application form."
                recommended_action = "Enter complete enrollment and faculty rosters."

        elif rule.code == "COMP-LAND-02":
            has_land_doc = "Land Use Certificate" in doc_types
            if has_land_doc:
                submitted_evidence = f"Uploaded Land Use Certificate ({doc_types['Land Use Certificate'].filename}). Declared Campus Area: {app.campus_area_sqm} sq.m."
                if app.campus_area_sqm >= 10000:
                    status = "Requirement Check Passed"
                else:
                    status = "Deficiency Detected"
                    missing_info = f"Campus area {app.campus_area_sqm} sq.m is below minimum 10,000 sq.m requirement."
                    recommended_action = "Provide contiguous plot registry or expansion plan."
            else:
                status = "Insufficient Evidence"
                missing_info = "No certified Land Use Certificate uploaded."
                recommended_action = "Upload Land Use Certificate issued by Revenue/Town Planning Department."

        elif rule.code == "COMP-FIRE-03":
            has_fire_noc = "Fire Safety NOC" in doc_types
            if has_fire_noc:
                fire_doc = doc_types["Fire Safety NOC"]
                submitted_evidence = f"Uploaded {fire_doc.filename}."
                status = "Requirement Check Passed"
                recommended_action = "Verify periodic mock-drill and fire extinguisher maintenance logs."
            else:
                status = "Deficiency Detected"
                missing_info = "Mandatory Fire Safety NOC missing from application dossier."
                recommended_action = "Upload valid Fire Safety clearance from Directorate of Fire Services."

        elif rule.code == "COMP-BUILT-04":
            has_bldg = "Building Safety Certificate" in doc_types or "Occupancy Certificate" in doc_types
            if app.builtup_area_sqm > 0 and app.student_intake > 0:
                sqm_per_student = round(app.builtup_area_sqm / max(app.student_intake, 1), 2)
                submitted_evidence = f"Total Built-up Area: {app.builtup_area_sqm} sq.m. Calculated: {sqm_per_student} sq.m / student."
                if sqm_per_student >= 4.5 and has_bldg:
                    status = "Requirement Check Passed"
                elif not has_bldg:
                    status = "Insufficient Evidence"
                    missing_info = "Building Safety / Occupancy Certificate missing."
                    recommended_action = "Attach certified structural engineer occupancy certificate."
                else:
                    status = "Deficiency Detected"
                    missing_info = f"Built-up area ratio ({sqm_per_student} sq.m/student) is below 4.5 sq.m norm."
                    recommended_action = "Submit approved expansion drawings."
            else:
                status = "Insufficient Evidence"
                missing_info = "Built-up area figures incomplete in application profile."

        elif rule.code == "COMP-LAB-05":
            submitted_evidence = "Institutional digital infrastructure declarations in application annexure."
            status = "Evidence Present"
            recommended_action = "Verify broadband speed test reports and software license asset ledgers."

        elif rule.code == "COMP-BARRIER-06":
            has_photos = "Infrastructure Layout & Photos" in doc_types
            if has_photos:
                submitted_evidence = f"Geo-tagged layout and photographs submitted ({doc_types['Infrastructure Layout & Photos'].filename})."
                status = "Requirement Check Passed"
                recommended_action = "Ensure ramp handrails and auditory lift annunciators are maintained."
            else:
                status = "Manual Inspection Required"
                missing_info = "Photographic proof of barrier-free access ramps and lifts not provided."
                recommended_action = "Upload photos of barrier-free entrances and accessible restrooms."

        item = models.ComplianceItem(
            application_id=app.id,
            rule_id=rule.id,
            requirement_title=rule.name,
            category=rule.category,
            status=status,
            submitted_evidence=submitted_evidence,
            missing_info=missing_info,
            reviewer_comments=reviewer_comments,
            recommended_action=recommended_action
        )
        items.append(item)
        db.add(item)

    db.commit()
    return items
