import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  FileCheck2,
  Clock,
  Printer,
  RotateCw,
  Upload,
  Download,
  Edit3,
  Trash2,
  ArrowLeft,
  Calendar,
  Building2,
  Users,
  GraduationCap,
  ExternalLink,
  ShieldCheck,
  Eye,
  Check,
  X,
  Scale,
  History
} from 'lucide-react';
import { api } from '../services/api';
import { Application, Document, ValidationFinding, VerificationRecord, ComplianceItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const ApplicationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [app, setApp] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'validation' | 'verification' | 'compliance' | 'history'>('overview');

  // Modals
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadType, setUploadType] = useState('Affiliation Certificate');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Manual Corrections Modal
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [correctionFields, setCorrectionFields] = useState<Record<string, string>>({});
  const [isSavingCorrections, setIsSavingCorrections] = useState(false);

  // Decision Modal
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [decisionChoice, setDecisionChoice] = useState('Approved');
  const [decisionNotes, setDecisionNotes] = useState('');
  const [isSavingDecision, setIsSavingDecision] = useState(false);

  // Finding Review Modal
  const [reviewingFinding, setReviewingFinding] = useState<ValidationFinding | null>(null);
  const [findingDecision, setFindingDecision] = useState('Reviewed - Deficiency Confirmed');
  const [findingComment, setFindingComment] = useState('');

  // Inspect Payload Modal
  const [inspectingVerif, setInspectingVerif] = useState<VerificationRecord | null>(null);

  const loadApplication = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await api.getApplication(parseInt(id));
      setApp(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load application details', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplication();
  }, [id]);

  const handleRunValidation = async () => {
    if (!app) return;
    try {
      showToast('Executing automated regulatory validation rules...', 'info');
      await api.runValidation(app.id);
      showToast('Validation re-executed successfully.', 'success');
      loadApplication();
    } catch (err: any) {
      showToast(err.message || 'Validation failed', 'error');
    }
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!app || !selectedFile) return;

    try {
      setIsUploading(true);
      await api.uploadDocument(app.id, uploadType, selectedFile);
      showToast(`Document uploaded & processed for ${uploadType}!`, 'success');
      setShowUploadModal(false);
      setSelectedFile(null);
      loadApplication();
    } catch (err: any) {
      showToast(err.message || 'Upload failed', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = async (docId: number, fname: string) => {
    if (!confirm(`Are you sure you want to remove '${fname}'?`)) return;
    try {
      await api.deleteDocument(docId);
      showToast(`Document ${fname} removed. Validation re-evaluated.`, 'info');
      loadApplication();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete document', 'error');
    }
  };

  const handleSaveCorrections = async () => {
    if (!editingDoc) return;
    try {
      setIsSavingCorrections(true);
      await api.updateDocumentCorrections(editingDoc.id, correctionFields);
      showToast('Extracted field corrections recorded and validation updated.', 'success');
      setEditingDoc(null);
      loadApplication();
    } catch (err: any) {
      showToast(err.message || 'Failed to save corrections', 'error');
    } finally {
      setIsSavingCorrections(false);
    }
  };

  const handleSaveDecision = async () => {
    if (!app) return;
    try {
      setIsSavingDecision(true);
      await api.recordDecision(app.id, decisionChoice, decisionNotes);
      showToast(`Decision '${decisionChoice}' recorded on application dossier.`, 'success');
      setShowDecisionModal(false);
      loadApplication();
    } catch (err: any) {
      showToast(err.message || 'Failed to record decision', 'error');
    } finally {
      setIsSavingDecision(false);
    }
  };

  const handleSaveFindingReview = async () => {
    if (!reviewingFinding) return;
    try {
      await api.updateFinding(reviewingFinding.id, {
        status: 'reviewed',
        reviewer_decision: findingDecision,
        reviewer_comment: findingComment
      });
      showToast('Finding review observation recorded.', 'success');
      setReviewingFinding(null);
      loadApplication();
    } catch (err: any) {
      showToast(err.message || 'Failed to update finding', 'error');
    }
  };

  const handleVerifySingle = async (verifId: number) => {
    try {
      showToast('Calling simulated issuing authority adapter...', 'info');
      const res = await api.verifyDocument(verifId);
      showToast(`Verification outcome: ${res.status}`, res.status === 'Verified' ? 'success' : 'warning');
      loadApplication();
    } catch (err: any) {
      showToast(err.message || 'Verification call failed', 'error');
    }
  };

  if (loading || !app) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-500">
        <RotateCw className="w-8 h-8 animate-spin text-blue-600 mb-3" />
        <p className="text-sm font-medium">Loading Institutional Dossier...</p>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'Checks Passed': 'bg-emerald-50 text-emerald-700 border-emerald-200',
      'Deficiencies Found': 'bg-rose-50 text-rose-700 border-rose-200',
      'Manual Review Required': 'bg-amber-50 text-amber-700 border-amber-200',
      'Verification Pending': 'bg-blue-50 text-blue-700 border-blue-200',
      'Submitted': 'bg-sky-50 text-sky-700 border-sky-200',
      'Draft': 'bg-slate-100 text-slate-700 border-slate-200',
      'Approved': 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold',
    };
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${styles[status] || styles['Draft']}`}>
        <span className="w-2 h-2 rounded-full bg-current" />
        {status}
      </span>
    );
  };

  const programmes = JSON.parse(app.programmes_json || '[]');
  const docs = app.documents || [];
  const findings = app.findings || [];
  const verifications = app.verifications || [];
  const complianceItems = app.compliance_items || [];

  return (
    <div className="space-y-6">
      {/* Dossier Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <button
              onClick={() => navigate('/applications')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-blue-600 mb-2 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Applications List
            </button>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {app.institution_name}
              </h1>
              <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
                {app.application_number}
              </span>
              {getStatusBadge(app.status)}
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2 font-medium">
              <span>Code: <strong className="text-slate-800 font-mono">{app.institution_code}</strong></span>
              <span>•</span>
              <span>Category: <strong className="text-slate-800">{app.category}</strong></span>
              <span>•</span>
              <span>Academic Cycle: <strong className="text-slate-800">{app.academic_year}</strong></span>
              <span>•</span>
              <span>
                Submission:{' '}
                <strong className="text-slate-800">
                  {app.submission_date ? new Date(app.submission_date).toLocaleDateString() : 'Draft'}
                </strong>
              </span>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleRunValidation}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5 text-blue-600" />
              Re-run Validation
            </button>
            <button
              onClick={() => window.open(`/api/reports/validation/${app.id}`, '_blank')}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              Print Dossier
            </button>

            {(user?.role === 'reviewer' || user?.role === 'admin') && (
              <button
                onClick={() => setShowDecisionModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs shadow-blue-600/20 transition-all cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                Record Reviewer Decision
              </button>
            )}
          </div>
        </div>

        {/* Reviewer Note Banner if present */}
        {app.reviewer_notes && (
          <div className="mt-4 p-3 rounded-xl bg-blue-50/70 border border-blue-200/60 text-xs text-blue-900 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Official AICTE Reviewer Remarks:</span> {app.reviewer_notes}
              {app.final_decision !== 'Pending' && (
                <span className="ml-2 font-bold uppercase text-blue-700">[{app.final_decision}]</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Connected Tabs Navigation */}
      <div className="border-b border-slate-200 flex flex-wrap gap-2 text-xs font-semibold">
        {[
          { key: 'overview', label: '1. Overview', icon: FileText, count: null },
          { key: 'documents', label: '2. Documents & OCR', icon: Upload, count: docs.length },
          { key: 'validation', label: '3. Validation Results', icon: AlertTriangle, count: findings.length },
          { key: 'verification', label: '4. Issuing Authority Verif', icon: FileCheck2, count: verifications.length },
          { key: 'compliance', label: '5. Regulatory Compliance', icon: Scale, count: complianceItems.length },
          { key: 'history', label: '6. Review History', icon: History, count: null },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 py-3 px-4 border-b-2 font-bold transition-all cursor-pointer ${
                isActive
                  ? 'border-blue-600 text-blue-600 bg-white rounded-t-xl'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    isActive ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="text-xs text-slate-500 mb-1">Approved Student Intake</div>
              <div className="text-xl font-extrabold text-slate-900">{app.student_intake} seats</div>
              <div className="text-[11px] text-slate-400 mt-1">Across all branches</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="text-xs text-slate-500 mb-1">Teaching Faculty on Roll</div>
              <div className="text-xl font-extrabold text-slate-900">{app.faculty_count} faculty</div>
              <div className="text-[11px] text-slate-400 mt-1">
                FSR Ratio: 1:{app.faculty_count > 0 ? (app.student_intake / app.faculty_count).toFixed(1) : 0}
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="text-xs text-slate-500 mb-1">Total Campus Land Area</div>
              <div className="text-xl font-extrabold text-slate-900">{app.campus_area_sqm} sq.m</div>
              <div className="text-[11px] text-slate-400 mt-1">Educational zoning certified</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="text-xs text-slate-500 mb-1">Instructional Built-up Area</div>
              <div className="text-xl font-extrabold text-slate-900">{app.builtup_area_sqm} sq.m</div>
              <div className="text-[11px] text-slate-400 mt-1">
                {(app.builtup_area_sqm / Math.max(app.student_intake, 1)).toFixed(1)} sq.m / student
              </div>
            </div>
          </div>

          {/* Programmes Table */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <h3 className="font-bold text-sm text-slate-900 mb-3">Academic Programmes & Approved Sanctioned Intake</h3>
            {programmes.length === 0 ? (
              <div className="text-xs text-slate-500 py-4 text-center">No individual programmes configured.</div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Programme / Branch</th>
                    <th className="py-2.5 px-3">Level</th>
                    <th className="py-2.5 px-3">Sanctioned Intake</th>
                    <th className="py-2.5 px-3">Affiliating University Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {programmes.map((p: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{p.name}</td>
                      <td className="py-2.5 px-3 text-slate-600">{p.level || 'Undergraduate'}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-blue-600">{p.intake} seats</td>
                      <td className="py-2.5 px-3 text-emerald-600 font-medium">Affiliation Verified</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: DOCUMENTS & OCR */}
      {activeTab === 'documents' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Mandatory Statutory Documents & AI OCR Extractions</h3>
              <p className="text-xs text-slate-500">
                Uploaded PDFs and scans are validated, cryptographically hashed, and parsed into structured fields.
              </p>
            </div>
            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" /> Upload Document
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Document Category</th>
                  <th className="py-3 px-4">Filename & SHA-256</th>
                  <th className="py-3 px-4">Extracted Fields</th>
                  <th className="py-3 px-4 text-center">OCR Confidence</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {docs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      No documents uploaded yet. Click "Upload Document" to attach files.
                    </td>
                  </tr>
                ) : (
                  docs.map((doc) => {
                    const fields = JSON.parse(doc.extracted_fields_json || '{}');
                    return (
                      <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          <div>{doc.document_type}</div>
                          <div className="text-[10px] text-slate-400 font-normal">
                            Uploaded by {doc.uploaded_by} on {new Date(doc.uploaded_at).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-blue-600 flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5 shrink-0" />
                            <span>{doc.filename}</span>
                          </div>
                          <div className="font-mono text-[10px] text-slate-400 mt-0.5">
                            SHA: {doc.file_hash_sha256.substring(0, 16)}... ({Math.round(doc.file_size / 1024)} KB)
                          </div>
                          {doc.is_duplicate && (
                            <span className="inline-block mt-1 text-[10px] bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded border border-rose-200 font-semibold">
                              Exact SHA-256 Duplicate
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="space-y-0.5 text-[11px] text-slate-700">
                            {fields.certificate_number && (
                              <div>Cert No: <strong className="font-mono">{fields.certificate_number}</strong></div>
                            )}
                            {fields.expiry_date && (
                              <div>Valid To: <strong className="text-amber-800">{fields.expiry_date}</strong></div>
                            )}
                            {fields.faculty_count && (
                              <div>Staff Count: <strong>{fields.faculty_count}</strong></div>
                            )}
                            {fields.area && (
                              <div>Area: <strong>{fields.area} sq.m</strong></div>
                            )}
                            {doc.is_manually_corrected && (
                              <span className="inline-block text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded font-medium">
                                Manually Corrected
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full font-bold text-[11px] ${
                              doc.ocr_confidence >= 0.8
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {(doc.ocr_confidence * 100).toFixed(0)}%
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <a
                              href={`/uploads/${doc.storage_name}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Preview PDF / Image"
                            >
                              <Eye className="w-4 h-4" />
                            </a>
                            <button
                              onClick={() => {
                                setEditingDoc(doc);
                                setCorrectionFields(fields);
                              }}
                              className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Correct Extracted Data"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteDocument(doc.id, doc.filename)}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Delete Document"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: VALIDATION RESULTS */}
      {activeTab === 'validation' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Deterministic Rule Engine Findings</h3>
              <p className="text-xs text-slate-500">
                Automated validation checks executed against mandatory checklists, extracted dates, and consistency rules.
              </p>
            </div>
            <button
              onClick={handleRunValidation}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5 text-blue-600" />
              Re-evaluate All Rules
            </button>
          </div>

          {findings.length === 0 ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center text-emerald-900">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
              <h3 className="font-bold text-base">All Automated Checks Passed</h3>
              <p className="text-xs text-emerald-700 mt-1 max-w-md mx-auto">
                No missing documents, expired dates, duplicate files, or parameter inconsistencies detected in this application dossier.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {findings.map((f) => {
                const evidence = JSON.parse(f.evidence_data_json || '{}');
                const isCritical = f.severity === 'critical';
                const isWarning = f.severity === 'warning';

                return (
                  <div
                    key={f.id}
                    className={`p-5 rounded-2xl border transition-all ${
                      isCritical
                        ? 'bg-rose-50/40 border-rose-200'
                        : isWarning
                        ? 'bg-amber-50/40 border-amber-200'
                        : 'bg-blue-50/40 border-blue-200'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${
                              isCritical
                                ? 'bg-rose-100 text-rose-800 border-rose-300'
                                : isWarning
                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                : 'bg-blue-100 text-blue-800 border-blue-300'
                            }`}
                          >
                            {f.severity}
                          </span>
                          <span className="font-mono text-xs font-bold text-slate-600">{f.rule_code}</span>
                          <span className="text-xs text-slate-400">•</span>
                          <span className="text-xs font-semibold text-slate-500">Ref: {f.page_reference}</span>
                        </div>
                        <h4 className="font-bold text-sm text-slate-900">{f.rule_title}</h4>
                        <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{f.explanation}</p>
                      </div>

                      {/* Review Status & Button */}
                      <div className="flex items-center gap-2 shrink-0">
                        {f.status === 'reviewed' ? (
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300">
                            Reviewed: {f.reviewer_decision}
                          </span>
                        ) : (
                          (user?.role === 'reviewer' || user?.role === 'admin') && (
                            <button
                              onClick={() => {
                                setReviewingFinding(f);
                                setFindingComment(f.reviewer_comment || '');
                              }}
                              className="px-3 py-1.5 bg-white border border-slate-300 hover:border-blue-600 text-slate-800 hover:text-blue-600 rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                            >
                              Review & Record Action
                            </button>
                          )
                        )}
                      </div>
                    </div>

                    {/* Evidence & Recommendation */}
                    <div className="mt-3 pt-3 border-t border-slate-200/60 grid md:grid-cols-2 gap-3 text-xs">
                      <div className="bg-white/80 p-2.5 rounded-xl border border-slate-200/80">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                          Extracted Evidence Values
                        </div>
                        <pre className="font-mono text-[11px] text-slate-800 whitespace-pre-wrap">
                          {JSON.stringify(evidence, null, 2)}
                        </pre>
                      </div>
                      <div className="bg-white/80 p-2.5 rounded-xl border border-slate-200/80 flex flex-col justify-between">
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                            Recommended Reviewer Next Step
                          </div>
                          <p className="text-slate-700 text-xs leading-relaxed">{f.recommended_action}</p>
                        </div>
                        {f.reviewer_comment && (
                          <div className="mt-2 text-[11px] text-blue-900 bg-blue-50 p-2 rounded-lg border border-blue-200">
                            <strong>Officer Note:</strong> {f.reviewer_comment}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: ISSUING AUTHORITY VERIFICATION */}
      {activeTab === 'verification' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Simulated Issuing Authority Verification Service</h3>
              <p className="text-xs text-slate-500">
                Deterministic validation against synthetic central university, fire, and revenue authority registers.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                <tr>
                  <th className="py-3 px-4">Document Type</th>
                  <th className="py-3 px-4">Issuing Authority Source</th>
                  <th className="py-3 px-4">Verification Status</th>
                  <th className="py-3 px-4">Outcome Summary</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {verifications.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      No documents currently queued for authority verification.
                    </td>
                  </tr>
                ) : (
                  verifications.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {v.document?.document_type || 'Statutory Record'}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        <div className="font-semibold">{v.issuing_authority}</div>
                        <div className="text-[10px] text-slate-400 font-mono">Adapter: {v.verification_method}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                            v.status === 'Verified'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : v.status === 'Mismatch Detected'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : v.status === 'Expired'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {v.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={v.response_summary}>
                        {v.response_summary || 'Awaiting automated lookup.'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setInspectingVerif(v)}
                            className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          >
                            Inspect Payload
                          </button>
                          {(user?.role === 'reviewer' || user?.role === 'admin') && (
                            <button
                              onClick={() => handleVerifySingle(v.id)}
                              className="px-2.5 py-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs transition-all cursor-pointer"
                            >
                              Verify
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: REGULATORY COMPLIANCE */}
      {activeTab === 'compliance' && (
        <div className="space-y-4">
          <div>
            <h3 className="font-bold text-sm text-slate-900">AICTE Approval Process Handbook (APH) Regulatory Checklist</h3>
            <p className="text-xs text-slate-500">
              Deterministic evaluation against infrastructure, student-to-faculty ratios, and campus land norms.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {complianceItems.map((item) => (
              <div key={item.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {item.category}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                      item.status === 'Requirement Check Passed'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : item.status === 'Deficiency Detected'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
                <h4 className="font-bold text-sm text-slate-900">{item.requirement_title}</h4>
                <div className="text-xs text-slate-600">
                  <strong>Submitted Evidence:</strong> {item.submitted_evidence || 'None attached.'}
                </div>
                {item.missing_info && (
                  <div className="text-xs text-rose-700 bg-rose-50 p-2 rounded-lg border border-rose-200">
                    <strong>Deficiency:</strong> {item.missing_info}
                  </div>
                )}
                {item.recommended_action && (
                  <div className="text-xs text-slate-500 italic">
                    Action: {item.recommended_action}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: REVIEW HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div>
            <h3 className="font-bold text-sm text-slate-900">Immutable Application Audit Trail</h3>
            <p className="text-xs text-slate-500">
              Cryptographically timestamped chronological log of all actions, uploads, validations, and decisions.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            {app.audit_logs && app.audit_logs.length > 0 ? (
              app.audit_logs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 pb-3 border-b border-slate-100 last:border-0 last:pb-0 text-xs">
                  <div className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">{log.action.replace(/_/g, ' ')}</span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-slate-600 mt-0.5">{log.details}</p>
                    <div className="text-[10px] text-slate-400 mt-1">
                      Actor: {log.actor_name} ({log.actor_role}) • IP: {log.ip_address}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-xs text-slate-500 text-center py-6">No audit records found for this dossier.</div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: Upload Document Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Upload Supporting Document</h3>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadDocument} className="py-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Document Category</label>
                <select
                  value={uploadType}
                  onChange={(e) => setUploadType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 text-xs font-medium"
                >
                  <option value="Affiliation Certificate">Affiliation Certificate</option>
                  <option value="Fire Safety NOC">Fire Safety NOC</option>
                  <option value="Land Use Certificate">Land Use Certificate</option>
                  <option value="Building Safety Certificate">Building Safety Certificate</option>
                  <option value="Faculty Roster & Qualifications">Faculty Roster & Qualifications</option>
                  <option value="Infrastructure Layout & Photos">Infrastructure Layout & Photos</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select File (PDF, PNG, JPEG up to 15MB)</label>
                <input
                  type="file"
                  required
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full p-2 border border-slate-200 rounded-xl text-xs bg-slate-50 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl text-[11px] text-slate-500">
                Uploaded document will be scanned with PyMuPDF/OCR, computed for exact SHA-256 duplicate matches, and verified against statutory rules.
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !selectedFile}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl disabled:opacity-50 cursor-pointer"
                >
                  {isUploading ? 'Extracting & Validating...' : 'Upload & Process'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Record Decision Modal */}
      {showDecisionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Record AICTE Official Regulatory Decision</h3>
              <button onClick={() => setShowDecisionModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Decision Outcome</label>
                <select
                  value={decisionChoice}
                  onChange={(e) => setDecisionChoice(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="Approved">Grant Approval (Full EoA Accorded)</option>
                  <option value="Clarification Requested">Request Clarification / Hearing</option>
                  <option value="Deficiency Notice Issued">Issue Deficiency Notice (Rectification Required)</option>
                  <option value="Rejected">Reject Application</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Officer Observations & Justification</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Record formal statutory reasoning, citing document verification checks..."
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-xl text-[11px] text-amber-900 border border-amber-200">
                Notice: All regulatory decisions are permanently logged to the append-only audit trail and notified to the applicant institution.
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 text-xs">
              <button
                onClick={() => setShowDecisionModal(false)}
                className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDecision}
                disabled={isSavingDecision}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl cursor-pointer"
              >
                {isSavingDecision ? 'Recording...' : 'Confirm Regulatory Decision'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Manual Field Correction */}
      {editingDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-base text-slate-900">Correct Extracted Field Data</h3>
                <p className="text-xs text-slate-500">{editingDoc.document_type} ({editingDoc.filename})</p>
              </div>
              <button onClick={() => setEditingDoc(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs max-h-96 overflow-y-auto">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Certificate Number</label>
                <input
                  type="text"
                  value={correctionFields.certificate_number || ''}
                  onChange={(e) => setCorrectionFields({ ...correctionFields, certificate_number: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Extracted Institution Name</label>
                <input
                  type="text"
                  value={correctionFields.institution_name || ''}
                  onChange={(e) => setCorrectionFields({ ...correctionFields, institution_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Issue Date</label>
                  <input
                    type="text"
                    value={correctionFields.issue_date || ''}
                    onChange={(e) => setCorrectionFields({ ...correctionFields, issue_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Expiry / Valid Date</label>
                  <input
                    type="text"
                    value={correctionFields.expiry_date || ''}
                    onChange={(e) => setCorrectionFields({ ...correctionFields, expiry_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-amber-800"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 text-xs">
              <button onClick={() => setEditingDoc(null)} className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-xl">
                Cancel
              </button>
              <button
                onClick={handleSaveCorrections}
                disabled={isSavingCorrections}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl cursor-pointer"
              >
                {isSavingCorrections ? 'Saving...' : 'Save Corrections & Re-validate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Review Finding Modal */}
      {reviewingFinding && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Record Finding Review Observation</h3>
              <button onClick={() => setReviewingFinding(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-900">{reviewingFinding.rule_title}</div>
                <div className="text-slate-600 mt-1">{reviewingFinding.explanation}</div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reviewer Disposition</label>
                <select
                  value={findingDecision}
                  onChange={(e) => setFindingDecision(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium focus:outline-none"
                >
                  <option value="Reviewed - Deficiency Confirmed">Reviewed - Deficiency Confirmed</option>
                  <option value="Clarification Requested from Institution">Clarification Requested from Institution</option>
                  <option value="Waived with Officer Justification">Waived with Officer Justification</option>
                  <option value="Resolved - Supporting Evidence Verified">Resolved - Supporting Evidence Verified</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Observation Remarks</label>
                <textarea
                  rows={3}
                  placeholder="State officer observations and reference to gazette or verified records..."
                  value={findingComment}
                  onChange={(e) => setFindingComment(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 text-xs">
              <button onClick={() => setReviewingFinding(null)} className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-xl">
                Cancel
              </button>
              <button
                onClick={handleSaveFindingReview}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl cursor-pointer"
              >
                Record Observation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Inspect Payload Modal */}
      {inspectingVerif && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-base text-slate-900">Authority Verification JSON Payload</h3>
                <p className="text-xs text-slate-500">{inspectingVerif.issuing_authority}</p>
              </div>
              <button onClick={() => setInspectingVerif(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs max-h-96 overflow-y-auto font-mono">
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Simulated Authority Response Payload
                </div>
                <pre className="p-3 bg-slate-900 text-emerald-400 rounded-xl text-[11px] overflow-x-auto">
                  {JSON.stringify(
                    typeof inspectingVerif.response_payload === 'string'
                      ? JSON.parse(inspectingVerif.response_payload || '{}')
                      : inspectingVerif.response_payload,
                    null,
                    2
                  )}
                </pre>
              </div>

              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Query Request Payload
                </div>
                <pre className="p-3 bg-slate-100 text-slate-800 rounded-xl text-[11px] overflow-x-auto">
                  {JSON.stringify(
                    typeof inspectingVerif.request_payload === 'string'
                      ? JSON.parse(inspectingVerif.request_payload || '{}')
                      : inspectingVerif.request_payload,
                    null,
                    2
                  )}
                </pre>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setInspectingVerif(null)}
                className="px-4 py-2 bg-slate-900 text-white font-semibold rounded-xl text-xs cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
