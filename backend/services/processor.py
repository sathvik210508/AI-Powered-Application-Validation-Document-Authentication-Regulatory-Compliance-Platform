import os
import hashlib
import re
import json
from datetime import datetime
from typing import Dict, Any, Tuple
import pypdf
from PIL import Image

try:
    import pytesseract
    PYTESSERACT_AVAILABLE = True
except ImportError:
    PYTESSERACT_AVAILABLE = False

def compute_sha256(filepath: str) -> str:
    sha256 = hashlib.sha256()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            sha256.update(chunk)
    return sha256.hexdigest()

def extract_pdf_data(filepath: str) -> Tuple[str, int, Dict[str, Any], float]:
    """
    Extracts text, page count, metadata, and confidence from a PDF file.
    """
    text_content = []
    metadata = {}
    page_count = 1
    confidence = 0.95

    try:
        reader = pypdf.PdfReader(filepath)
        page_count = len(reader.pages)
        if reader.metadata:
            for k, v in reader.metadata.items():
                if v:
                    metadata[str(k)] = str(v)
        
        for idx, page in enumerate(reader.pages):
            page_text = page.extract_text() or ""
            if page_text.strip():
                text_content.append(f"--- PAGE {idx+1} ---\n" + page_text)
            else:
                # Page has no text layer, could be a scanned image
                pass

        full_text = "\n\n".join(text_content)
        
        # If no extractable text was found, it might be a scanned PDF
        if not full_text.strip():
            confidence = 0.45
            full_text = "[Notice: Document appears to be a scanned PDF with minimal or no embedded text layer.]"
            
    except Exception as e:
        full_text = f"[Error reading PDF stream: {str(e)}]"
        confidence = 0.20

    return full_text, page_count, metadata, confidence

def extract_image_data(filepath: str) -> Tuple[str, int, Dict[str, Any], float]:
    """
    Extracts metadata, dimensions, and performs OCR if engine is available.
    """
    text = ""
    metadata = {}
    confidence = 0.85
    page_count = 1

    try:
        with Image.open(filepath) as img:
            metadata["dimensions"] = f"{img.width}x{img.height}"
            metadata["format"] = img.format
            metadata["mode"] = img.mode
            
            # Check for suspicious dimensions / aspect ratios
            aspect_ratio = img.width / max(img.height, 1)
            metadata["aspect_ratio"] = round(aspect_ratio, 2)
            
            # Run Tesseract if available
            if PYTESSERACT_AVAILABLE:
                try:
                    ocr_result = pytesseract.image_to_string(img)
                    if ocr_result.strip():
                        text = ocr_result.strip()
                        confidence = 0.90
                    else:
                        text = "[Scanned Image processed. No legible text characters identified.]"
                        confidence = 0.40
                except Exception as ocr_err:
                    text = f"[OCR Service note: Tesseract backend unavailable or image unreadable - {str(ocr_err)}]"
                    confidence = 0.50
            else:
                text = "[Document processed via image analyzer. Visual inspection metadata recorded.]"
                confidence = 0.70
    except Exception as e:
        text = f"[Image processing error: {str(e)}]"
        confidence = 0.20

    return text, page_count, metadata, confidence

def parse_dates_from_text(text: str) -> Dict[str, str]:
    """
    Extracts issue and expiry dates using pattern matching.
    """
    dates = {}
    # Common date formats: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, or Month DD, YYYY
    date_pattern = r'(\b\d{1,2}[-/\.]\d{1,2}[-/\.]\d{4}\b|\b\d{4}[-/\.]\d{1,2}[-/\.]\d{1,2}\b|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4}\b)'
    
    # Check for issue date markers
    issue_match = re.search(r'(?:issue(?:d)?\s*date|dated|date\s*of\s*issue)[:\s]+' + date_pattern, text, re.IGNORECASE)
    if issue_match:
        dates["issue_date"] = issue_match.group(1)
        
    # Check for expiry / validity date markers
    expiry_match = re.search(r'(?:valid\s*(?:up\s*to|until|till)|expir(?:y|es|ed\s*on)|validity\s*period\s*to)[:\s]+' + date_pattern, text, re.IGNORECASE)
    if expiry_match:
        dates["expiry_date"] = expiry_match.group(1)
        
    return dates

def extract_structured_fields(text: str, document_type: str, metadata: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extracts high-value regulatory fields: Certificate Number, Institution Name, Dates, Authority, Counts.
    """
    fields: Dict[str, Any] = {
        "document_type": document_type,
        "extracted_at": datetime.utcnow().isoformat()
    }
    
    # Certificate Number search
    cert_patterns = [
        r'(?:certificate\s*no\.?|order\s*no\.?|ref\s*no\.?|reference\s*no\.?|registration\s*no\.?|noc\s*no\.?)[:\s]+([A-Z0-9/\-_]{4,30})',
        r'([A-Z]{2,6}[/-][A-Z0-9]{2,10}[/-]\d{3,8})',
    ]
    for pattern in cert_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            fields["certificate_number"] = match.group(1).strip()
            break

    # Institution Name search
    name_patterns = [
        r'(?:institution|institute|college|academy|university|campus)[:\s]+([^\n\r,]{5,80}(?:Institute|College|Academy|University|Campus|Polytechnic)[^\n\r,]*)',
        r'(?:granted\s*to|issued\s*to|affiliation\s*of|name\s*of\s*institution)[:\s]+([^\n\r,]{5,80})'
    ]
    for pattern in name_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            fields["institution_name"] = match.group(1).strip()
            break

    # Date extraction
    dates = parse_dates_from_text(text)
    fields.update(dates)

    # Specific fields by document type
    if "Faculty" in document_type or "Roster" in document_type:
        faculty_match = re.search(r'(?:total\s*faculty|teaching\s*staff|faculty\s*count|roster\s*total)[:\s]+(\d+)', text, re.IGNORECASE)
        if faculty_match:
            fields["faculty_count"] = int(faculty_match.group(1))
            
    if "Land" in document_type or "Occupancy" in document_type:
        area_match = re.search(r'(?:total\s*area|campus\s*area|built[- ]?up\s*area)[:\s]+(\d+(?:\.\d+)?)\s*(?:sq\.?\s*m|acres|sq\.?\s*ft)?', text, re.IGNORECASE)
        if area_match:
            fields["area"] = area_match.group(1)

    if "Fire" in document_type:
        fields["issuing_authority"] = "Directorate of Fire & Emergency Services"
    elif "Affiliation" in document_type:
        fields["issuing_authority"] = "State Affiliating University"
    elif "Land" in document_type or "Occupancy" in document_type:
        fields["issuing_authority"] = "Town Planning & Revenue Authority"

    return fields

def process_uploaded_document(filepath: str, document_type: str) -> Dict[str, Any]:
    """
    Main processing pipeline: file validation, hash calculation, text/metadata extraction, field extraction.
    """
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"File not found: {filepath}")

    file_size = os.path.getsize(filepath)
    file_hash = compute_sha256(filepath)
    filename = os.path.basename(filepath)
    ext = os.path.splitext(filename)[1].lower()

    if ext == ".pdf":
        text, pages, metadata, confidence = extract_pdf_data(filepath)
        mime = "application/pdf"
    elif ext in [".png", ".jpg", ".jpeg"]:
        text, pages, metadata, confidence = extract_image_data(filepath)
        mime = "image/png" if ext == ".png" else "image/jpeg"
    else:
        text = "[Unsupported file type for automated extraction]"
        pages = 1
        metadata = {}
        confidence = 0.10
        mime = "application/octet-stream"

    extracted_fields = extract_structured_fields(text, document_type, metadata)

    return {
        "file_size": file_size,
        "file_hash": file_hash,
        "mime_type": mime,
        "page_count": pages,
        "ocr_text": text,
        "metadata": metadata,
        "confidence": confidence,
        "extracted_fields": extracted_fields
    }
