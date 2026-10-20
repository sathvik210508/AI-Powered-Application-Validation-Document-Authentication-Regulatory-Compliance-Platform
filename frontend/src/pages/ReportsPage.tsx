import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  Printer,
  RefreshCw,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Filter,
  Eye,
  Calendar,
  Layers,
  ShieldCheck
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { api } from '../services/api';
import { AnalyticsSummary, Application } from '../types';
import { useToast } from '../context/ToastContext';

export const ReportsPage: React.FC = () => {
  const { showToast } = useToast();
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<number | null>(null);
  const [dossierReport, setDossierReport] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [analyticsData, appsData] = await Promise.all([
        api.getAnalytics(),
        api.getApplications()
      ]);
      setAnalytics(analyticsData);
      setApplications(appsData);
      if (appsData.length > 0 && !selectedAppId) {
        setSelectedAppId(appsData[0].id);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load report analytics', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedAppId) {
      const loadReport = async () => {
        try {
          setReportLoading(true);
          const data = await api.getPrintableReport(selectedAppId);
          setDossierReport(data);
        } catch {
          setDossierReport(null);
        } finally {
          setReportLoading(false);
        }
      };
      loadReport();
    }
  }, [selectedAppId]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    window.open('/api/applications/export/csv', '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Regulatory Analytics & Printable Validation Reports
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Institutional processing metrics, deficiency frequency distributions, and printable audit dossiers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Export All Data (CSV)
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs shadow-blue-600/20 transition-all cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" /> Print Validation Dossier
          </button>
        </div>
      </div>

      {/* Analytics Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 no-print">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-xs text-slate-500 font-semibold mb-1">Total Processed Applications</div>
          <div className="text-2xl font-extrabold text-slate-900">{analytics?.summary.total_applications ?? 0}</div>
          <div className="text-[11px] text-slate-400 mt-1">AY 2026-27 review window</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-xs text-slate-500 font-semibold mb-1">Checks Passed Ratio</div>
          <div className="text-2xl font-extrabold text-emerald-600">
            {analytics?.summary.total_applications
              ? ((analytics.summary.checks_passed / analytics.summary.total_applications) * 100).toFixed(0)
              : 0}
            %
          </div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">
            {analytics?.summary.checks_passed} applications clean
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-xs text-slate-500 font-semibold mb-1">Average Automated AI Latency</div>
          <div className="text-2xl font-extrabold text-blue-600">
            {analytics?.summary.avg_validation_latency_seconds ?? 1.45}s
          </div>
          <div className="text-[11px] text-blue-600 font-medium mt-1">OCR extraction & rule evaluation</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-xs text-slate-500 font-semibold mb-1">Deficiency Flag Rate</div>
          <div className="text-2xl font-extrabold text-rose-600">
            {analytics?.summary.deficiencies_found ?? 0} cases
          </div>
          <div className="text-[11px] text-rose-600 font-medium mt-1">Mandatory rectification notices</div>
        </div>
      </div>

      {/* Select Application for Dossier Report */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-700">Generate Dossier for Institution:</span>
        </div>
        <select
          value={selectedAppId || ''}
          onChange={(e) => setSelectedAppId(parseInt(e.target.value))}
          className="text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-medium text-slate-800 focus:outline-none"
        >
          {applications.map((a) => (
            <option key={a.id} value={a.id}>
              {a.application_number} — {a.institution_name} ({a.category})
            </option>
          ))}
        </select>
      </div>

      {/* Printable Report Canvas */}
      {dossierReport && (
        <div className="bg-white p-8 rounded-2xl border border-slate-300 shadow-lg space-y-6 print:border-0 print:shadow-none print:p-0">
          {/* Official Letterhead */}
          <div className="border-b-2 border-slate-900 pb-4 text-center space-y-1">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              ALL INDIA COUNCIL FOR TECHNICAL EDUCATION
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              INSTITUTIONAL VALIDATION & COMPLIANCE DOSSIER
            </h2>
            <div className="text-xs text-slate-600">
              Regulatory Approval Cycle: <strong>{dossierReport.application.academic_year}</strong> • Dossier Ref:{' '}
              <span className="font-mono font-bold text-blue-700">{dossierReport.report_id}</span>
            </div>
          </div>

          {/* Institutional Parameters Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Institution Name</span>
              <strong className="text-slate-900 font-bold">{dossierReport.application.institution_name}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">AICTE Permanent ID</span>
              <strong className="font-mono text-slate-900">{dossierReport.application.institution_code}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Regulatory Category</span>
              <strong className="text-slate-900">{dossierReport.application.category}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Preliminary Outcome</span>
              <strong className="text-blue-700 font-bold uppercase">{dossierReport.application.status}</strong>
            </div>
          </div>

          {/* Section 1: Documents Verified */}
          <div className="space-y-2">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 border-b pb-1">
              1. Supporting Documents & Digital Checksums
            </h3>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 font-semibold">
                <tr>
                  <th className="p-2">Document Type</th>
                  <th className="p-2">Filename</th>
                  <th className="p-2">SHA-256 Hash</th>
                  <th className="p-2 text-center">OCR Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {dossierReport.documents.map((d: any) => (
                  <tr key={d.id}>
                    <td className="p-2 font-semibold text-slate-900">{d.document_type}</td>
                    <td className="p-2 text-slate-700">{d.filename}</td>
                    <td className="p-2 font-mono text-[10px] text-slate-500">{d.file_hash_sha256}</td>
                    <td className="p-2 text-center font-bold">{(d.ocr_confidence * 100).toFixed(0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Section 2: Validation Findings */}
          <div className="space-y-2">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 border-b pb-1">
              2. Deterministic Validation Findings & Evidential Discrepancies
            </h3>
            {dossierReport.findings.length === 0 ? (
              <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl font-medium">
                ✓ No non-compliances, expiry issues, or mismatches detected across tested rules.
              </div>
            ) : (
              <div className="space-y-2">
                {dossierReport.findings.map((f: any, idx: number) => (
                  <div key={idx} className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs">
                    <div className="flex items-center justify-between font-bold text-slate-900">
                      <span>[{f.rule_code}] {f.rule_title}</span>
                      <span className="uppercase text-[10px] px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-bold">
                        {f.severity}
                      </span>
                    </div>
                    <p className="text-slate-600 mt-1">{f.explanation}</p>
                    <div className="mt-1.5 text-[11px] text-slate-500">
                      <strong>Recommended Action:</strong> {f.recommended_action}
                    </div>
                    {f.reviewer_comment && (
                      <div className="mt-1 text-[11px] text-blue-900 font-medium">
                        <strong>Reviewer Observation:</strong> {f.reviewer_comment} ({f.reviewer_decision})
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 3: Statutory Authority Verifications */}
          <div className="space-y-2">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 border-b pb-1">
              3. Issuing Authority Clearance Outcomes
            </h3>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 font-semibold">
                <tr>
                  <th className="p-2">Document</th>
                  <th className="p-2">Issuing Authority Source</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Summary Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {dossierReport.verifications.map((v: any, idx: number) => (
                  <tr key={idx}>
                    <td className="p-2 font-semibold text-slate-900">{v.document_type}</td>
                    <td className="p-2 text-slate-700">{v.issuing_authority}</td>
                    <td className="p-2 font-bold text-blue-700">{v.status}</td>
                    <td className="p-2 text-slate-600">{v.summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Section 4: Mandatory Legal Disclaimer */}
          <div className="p-4 bg-slate-100 border border-slate-200 rounded-xl text-[11px] text-slate-600 leading-relaxed">
            <span className="font-bold text-slate-800">LEGAL & REGULATORY STATEMENT:</span> {dossierReport.disclaimer}
          </div>

          {/* Signatures */}
          <div className="pt-8 grid grid-cols-2 text-center text-xs text-slate-500">
            <div>
              <div className="h-12 border-b border-slate-300 w-48 mx-auto" />
              <div className="mt-1 font-semibold text-slate-800">AICTE Scrutiny Officer</div>
              <div>Bureau of Approval</div>
            </div>
            <div>
              <div className="h-12 border-b border-slate-300 w-48 mx-auto" />
              <div className="mt-1 font-semibold text-slate-800">Regional Director / Competent Authority</div>
              <div>All India Council for Technical Education</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
