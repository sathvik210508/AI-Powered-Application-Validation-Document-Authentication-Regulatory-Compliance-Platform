export type UserRole = 'institution' | 'reviewer' | 'admin';

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  institution_name?: string;
  created_at: string;
}

export interface Application {
  id: number;
  application_number: string;
  institution_name: string;
  institution_code: string;
  category: string;
  academic_year: string;
  status: string;
  faculty_count: number;
  student_intake: number;
  campus_area_sqm: number;
  builtup_area_sqm: number;
  programmes_json?: string;
  faculty_details_json?: string;
  infrastructure_details_json?: string;
  submission_date?: string;
  last_updated: string;
  created_by_id?: number;
  reviewer_notes: string;
  final_decision: string;
  documents?: Document[];
  findings?: ValidationFinding[];
  verifications?: VerificationRecord[];
  compliance_items?: ComplianceItem[];
  audit_logs?: AuditLog[];
}

export interface Document {
  id: number;
  application_id: number;
  document_type: string;
  filename: string;
  storage_name: string;
  file_size: number;
  file_hash_sha256: string;
  mime_type: string;
  page_count: number;
  status: string;
  ocr_confidence: number;
  is_duplicate: boolean;
  duplicate_of_id?: number;
  is_manually_corrected: boolean;
  manual_corrections_json?: string;
  ocr_text?: string;
  extracted_fields_json?: string;
  uploaded_at: string;
  uploaded_by: string;
  download_url?: string;
}

export interface ValidationFinding {
  id: number;
  application_id: number;
  document_id?: number;
  rule_code: string;
  rule_title: string;
  severity: 'critical' | 'warning' | 'info';
  status: 'open' | 'reviewed' | 'resolved' | 'waived';
  explanation: string;
  evidence_data_json: string;
  page_reference: string;
  detected_at: string;
  reviewer_comment: string;
  reviewer_decision: string;
  recommended_action: string;
}

export interface VerificationRecord {
  id: number;
  application_id: number;
  application_number?: string;
  institution_name?: string;
  document_id: number;
  document_type?: string;
  filename?: string;
  issuing_authority: string;
  verification_method: string;
  status: 'Verified' | 'Mismatch Detected' | 'Expired' | 'Verification Pending' | 'Source Unavailable' | 'Manual Review Required';
  request_time: string;
  response_time?: string;
  request_payload?: any;
  response_payload?: any;
  request_payload_json?: string;
  response_payload_json?: string;
  response_summary: string;
  is_simulated: boolean;
  reviewer_notes: string;
  document?: Document;
}

export interface ComplianceItem {
  id: number;
  application_id: number;
  rule_id?: number;
  requirement_title: string;
  category: string;
  status: 'Evidence Present' | 'Requirement Check Passed' | 'Deficiency Detected' | 'Insufficient Evidence' | 'Manual Inspection Required';
  submitted_evidence: string;
  missing_info: string;
  reviewer_comments: string;
  recommended_action: string;
}

export interface ComplianceRule {
  id: number;
  code: string;
  name: string;
  description: string;
  category: string;
  required_evidence: string;
  validation_conditions?: string;
  effective_version: string;
  is_active: boolean;
}

export interface AuditLog {
  id: number;
  actor_email: string;
  actor_name: string;
  actor_role: string;
  action: string;
  application_id?: number;
  document_id?: number;
  timestamp: string;
  previous_status?: string;
  new_status?: string;
  details: string;
  ip_address: string;
}

export interface AnomalyReport {
  document_id: number;
  filename: string;
  document_type: string;
  anomaly_score: number;
  risk_level: 'Low' | 'Medium' | 'High';
  signals: Array<{
    code: string;
    category: string;
    title: string;
    severity: string;
    points: number;
    evidence: string;
    explanation: string;
  }>;
  recommended_action: string;
  application_id: number;
  application_number: string;
  institution_name: string;
  uploaded_at: string;
  download_url: string;
}

export interface AnalyticsSummary {
  summary: {
    total_applications: number;
    pending_review: number;
    checks_passed: number;
    deficiencies_found: number;
    verification_pending: number;
    manual_review_required: number;
    avg_validation_latency_seconds: number;
  };
  status_distribution: Array<{ name: string; value: number; color: string }>;
  category_distribution: Array<{ name: string; value: number }>;
  verification_outcomes: Array<{ status: string; count: number; color: string }>;
  deficiency_breakdown: Array<{ name: string; count: number }>;
  processing_trend: Array<{ period: string; submitted: number; validated: number; approved: number }>;
}
