import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FileText,
  Search,
  Filter,
  Download,
  Plus,
  RefreshCw,
  ArrowUpRight,
  Building2,
  Calendar,
  Users,
  GraduationCap,
  Sparkles,
  X
} from 'lucide-react';
import { api } from '../services/api';
import { Application } from '../types';
import { useToast } from '../context/ToastContext';

export const ApplicationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();

  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [activeScenario, setActiveScenario] = useState<string>('All');

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    institution_name: '',
    institution_code: '',
    category: 'Extension of Approval (EoA)',
    academic_year: '2026-2027',
    faculty_count: 40,
    student_intake: 300,
    campus_area_sqm: 15000,
    builtup_area_sqm: 7500,
  });

  const loadApplications = async () => {
    try {
      setLoading(true);
      const data = await api.getApplications();
      setApplications(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load applications', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
    if (searchParams.get('action') === 'new') {
      setShowCreateModal(true);
    }
  }, [searchParams]);

  const handleCreateApplication = async (submitNow: boolean) => {
    if (!formData.institution_name.trim() || !formData.institution_code.trim()) {
      showToast('Please provide both Institution Name and Institutional Code', 'warning');
      return;
    }

    try {
      setIsSubmitting(true);
      const newApp = await api.createApplication({
        ...formData,
        programmes_json: JSON.stringify([
          { name: 'Computer Science & Engineering', level: 'UG', intake: Math.floor(formData.student_intake / 2) },
          { name: 'Electronics Engineering', level: 'UG', intake: Math.floor(formData.student_intake / 2) }
        ])
      });

      if (submitNow) {
        await api.submitApplication(newApp.id);
        showToast(`Application ${newApp.application_number} submitted! Automated checks executed.`, 'success');
      } else {
        showToast(`Draft ${newApp.application_number} saved successfully.`, 'info');
      }

      setShowCreateModal(false);
      loadApplications();
      navigate(`/applications/${newApp.id}`);
    } catch (err: any) {
      showToast(err.message || 'Failed to create application', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportCSV = () => {
    window.open(`/api/applications/export/csv?category=${categoryFilter}&status=${statusFilter}`, '_blank');
  };

  // Filter logic
  const filtered = applications.filter((app) => {
    const matchesSearch =
      app.application_number.toLowerCase().includes(search.toLowerCase()) ||
      app.institution_name.toLowerCase().includes(search.toLowerCase()) ||
      app.institution_code.toLowerCase().includes(search.toLowerCase());

    const matchesCategory = categoryFilter === 'All' || app.category === categoryFilter;
    const matchesStatus = statusFilter === 'All' || app.status === statusFilter;

    let matchesScenario = true;
    if (activeScenario === 'A') matchesScenario = app.application_number === 'APP-2026-001';
    if (activeScenario === 'B') matchesScenario = app.application_number === 'APP-2026-002';
    if (activeScenario === 'C') matchesScenario = app.application_number === 'APP-2026-003';
    if (activeScenario === 'D') matchesScenario = app.application_number === 'APP-2026-004';
    if (activeScenario === 'E') matchesScenario = app.application_number === 'APP-2026-005';
    if (activeScenario === 'F') matchesScenario = app.application_number === 'APP-2026-006';
    if (activeScenario === 'G') matchesScenario = app.application_number === 'APP-2026-007';

    return matchesSearch && matchesCategory && matchesStatus && matchesScenario;
  });

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
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[status] || styles['Draft']}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
        {status}
      </span>
    );
  };

  const scenarios = [
    { key: 'All', label: 'All Applications' },
    { key: 'A', label: 'Scenario A: All Passed', hint: 'Zero issues detected' },
    { key: 'B', label: 'Scenario B: Missing Doc', hint: 'Fire NOC absent' },
    { key: 'C', label: 'Scenario C: Expired Cert', hint: 'Affiliation expired' },
    { key: 'D', label: 'Scenario D: Inconsistent', hint: 'Faculty count mismatch' },
    { key: 'E', label: 'Scenario E: Duplicate File', hint: 'Identical SHA-256' },
    { key: 'F', label: 'Scenario F: Verif Mismatch', hint: 'Authority records differ' },
    { key: 'G', label: 'Scenario G: Manual Review', hint: 'Low OCR & Gateway Down' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Institutional Applications Management
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Dossiers submitted for Extension of Approval (EoA) and course/intake modifications.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm shadow-blue-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            New Application
          </button>
        </div>
      </div>

      {/* Demo Scenario Quick Filters */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>Quick Scenario Navigator (Hackathon Scenarios A to G)</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {scenarios.map((sc) => (
            <button
              key={sc.key}
              onClick={() => setActiveScenario(sc.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeScenario === sc.key
                  ? 'bg-blue-900 text-white shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              {sc.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Institution, ID or Code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-medium focus:outline-none"
          >
            <option value="All">All Categories</option>
            <option value="Extension of Approval (EoA)">Extension of Approval (EoA)</option>
            <option value="Change in Approved Intake">Change in Approved Intake</option>
            <option value="New Course Approval">New Course Approval</option>
            <option value="Programme Expansion">Programme Expansion</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-medium focus:outline-none"
          >
            <option value="All">All Statuses</option>
            <option value="Checks Passed">Checks Passed</option>
            <option value="Deficiencies Found">Deficiencies Found</option>
            <option value="Manual Review Required">Manual Review Required</option>
            <option value="Verification Pending">Verification Pending</option>
            <option value="Submitted">Submitted</option>
            <option value="Draft">Draft</option>
          </select>

          <button
            onClick={loadApplications}
            className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Applications Grid / Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-500">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="font-bold text-slate-700">No applications match the criteria</h3>
            <p className="text-xs text-slate-400 mt-1">Try resetting the search terms or scenario filters.</p>
          </div>
        ) : (
          filtered.map((app) => {
            const docCount = app.documents?.length ?? 0;
            const findingCount = app.findings?.length ?? 0;
            const criticalCount = app.findings?.filter((f) => f.severity === 'critical').length ?? 0;

            return (
              <div
                key={app.id}
                onClick={() => navigate(`/applications/${app.id}`)}
                className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                      {app.application_number}
                    </span>
                    {getStatusBadge(app.status)}
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                    {app.institution_name}
                  </h3>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">Code: {app.institution_code}</div>

                  <div className="mt-3.5 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                      <span>Intake: <strong>{app.student_intake}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>Faculty: <strong>{app.faculty_count}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>Built-up: <strong>{app.builtup_area_sqm} sq.m</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{app.academic_year}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500">
                      Docs: <strong className="text-slate-800">{docCount}</strong>
                    </span>
                    {findingCount > 0 ? (
                      <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${criticalCount > 0 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                        {findingCount} issues
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-emerald-600">No issues</span>
                    )}
                  </div>
                  <span className="text-blue-600 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                    Inspect <ArrowUpRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* New Application Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-lg text-slate-900">Initiate Institutional Application</h3>
                <p className="text-xs text-slate-500 mt-0.5">Extension of Approval (EoA) or Regulatory Modification</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Institution Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Institute of Engineering & Technology"
                  value={formData.institution_name}
                  onChange={(e) => setFormData({ ...formData, institution_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">AICTE Permanent ID / Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. AICTE-1-1009988"
                    value={formData.institution_code}
                    onChange={(e) => setFormData({ ...formData, institution_code: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Application Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 text-xs font-medium"
                  >
                    <option value="Extension of Approval (EoA)">Extension of Approval (EoA)</option>
                    <option value="Change in Approved Intake">Change in Approved Intake</option>
                    <option value="New Course Approval">New Course Approval</option>
                    <option value="Programme Expansion">Programme Expansion</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Approved Student Intake</label>
                  <input
                    type="number"
                    value={formData.student_intake}
                    onChange={(e) => setFormData({ ...formData, student_intake: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Declared Teaching Faculty</label>
                  <input
                    type="number"
                    value={formData.faculty_count}
                    onChange={(e) => setFormData({ ...formData, faculty_count: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Total Campus Land Area (sq.m)</label>
                  <input
                    type="number"
                    value={formData.campus_area_sqm}
                    onChange={(e) => setFormData({ ...formData, campus_area_sqm: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Total Built-up Area (sq.m)</label>
                  <input
                    type="number"
                    value={formData.builtup_area_sqm}
                    onChange={(e) => setFormData({ ...formData, builtup_area_sqm: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleCreateApplication(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                Save as Draft
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleCreateApplication(true)}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs shadow-blue-600/20 cursor-pointer"
              >
                {isSubmitting ? 'Processing...' : 'Submit & Run AI Validation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
