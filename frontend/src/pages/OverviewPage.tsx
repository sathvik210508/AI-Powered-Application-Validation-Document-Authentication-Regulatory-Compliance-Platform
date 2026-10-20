import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ShieldAlert,
  ArrowUpRight,
  Filter,
  Search,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  FileCheck2,
  AlertCircle
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { api } from '../services/api';
import { Application, AnalyticsSummary } from '../types';
import { useToast } from '../context/ToastContext';

export const OverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  // Table Filters & Pagination
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  const loadData = async () => {
    try {
      setLoading(true);
      const [analyticsData, appsData] = await Promise.all([
        api.getAnalytics(),
        api.getApplications()
      ]);
      setAnalytics(analyticsData);
      setApplications(appsData);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter applications for table
  const filteredApps = applications.filter((app) => {
    const matchesSearch =
      app.application_number.toLowerCase().includes(search.toLowerCase()) ||
      app.institution_name.toLowerCase().includes(search.toLowerCase()) ||
      app.institution_code.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || app.status === statusFilter;
    const matchesCategory = categoryFilter === 'All' || app.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const totalPages = Math.ceil(filteredApps.length / pageSize) || 1;
  const paginatedApps = filteredApps.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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

  if (loading && !analytics) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mb-3" />
        <p className="text-sm font-medium">Loading AICTE Decision-Support Dashboard...</p>
      </div>
    );
  }

  const summary = analytics?.summary;

  return (
    <div className="space-y-6">
      {/* Page Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Institutional Approval Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time validation findings, OCR document extraction & issuing authority verification status.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Sync Records
          </button>
          <button
            onClick={() => navigate('/applications?action=new')}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm shadow-blue-600/20 transition-all cursor-pointer"
          >
            + Create Application
          </button>
        </div>
      </div>

      {/* 6 Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Applications */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Total Applications</span>
            <FileText className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{summary?.total_applications ?? 0}</div>
          <div className="text-[11px] text-slate-400 mt-1">AY 2026-27 cycle</div>
        </div>

        {/* Pending Review */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Pending Review</span>
            <Clock className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{summary?.pending_review ?? 0}</div>
          <div className="text-[11px] text-sky-600 font-medium mt-1">Awaiting scrutiny</div>
        </div>

        {/* Checks Passed */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Checks Passed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-700">{summary?.checks_passed ?? 0}</div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">Zero deficiencies</div>
        </div>

        {/* Deficiencies Found */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Deficiencies Found</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-extrabold text-rose-700">{summary?.deficiencies_found ?? 0}</div>
          <div className="text-[11px] text-rose-600 font-medium mt-1">Mandatory rectifications</div>
        </div>

        {/* Verification Pending */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Verification Pending</span>
            <FileCheck2 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-extrabold text-blue-700">{summary?.verification_pending ?? 0}</div>
          <div className="text-[11px] text-blue-600 font-medium mt-1">Authority lookup active</div>
        </div>

        {/* Manual Review Required */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Manual Review</span>
            <ShieldAlert className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-extrabold text-amber-700">{summary?.manual_review_required ?? 0}</div>
          <div className="text-[11px] text-amber-600 font-medium mt-1">Officer action required</div>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Application Status Distribution (Donut) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Application Status Distribution</h3>
              <p className="text-xs text-slate-500">Live breakdown based on automated validation findings</p>
            </div>
          </div>
          <div className="h-64 flex items-center justify-center">
            {analytics?.status_distribution && analytics.status_distribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.status_distribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                  >
                    {analytics.status_distribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-400">No status records</div>
            )}
          </div>
        </div>

        {/* Chart 2: Monthly Processing Trend */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Monthly Processing & Validation Trend</h3>
              <p className="text-xs text-slate-500">Submitted vs Automated Validated Applications</p>
            </div>
            <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Avg Latency: {summary?.avg_validation_latency_seconds}s
            </span>
          </div>
          <div className="h-64">
            {analytics?.processing_trend ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.processing_trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSub" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="period" fontSize={11} stroke="#94a3b8" />
                  <YAxis fontSize={11} stroke="#94a3b8" />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                  <Area type="monotone" dataKey="submitted" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorSub)" name="Submitted" />
                  <Area type="monotone" dataKey="validated" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorVal)" name="Validated" />
                </AreaChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </div>

        {/* Chart 3: Verification Outcomes */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Document Issuing Authority Outcomes</h3>
              <p className="text-xs text-slate-500">Breakdown from simulated external authority gateway records</p>
            </div>
          </div>
          <div className="h-64">
            {analytics?.verification_outcomes ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.verification_outcomes} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="status" fontSize={10} stroke="#94a3b8" interval={0} angle={-15} textAnchor="end" height={45} />
                  <YAxis fontSize={11} stroke="#94a3b8" />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                  <Bar dataKey="count" fill="#2563eb" radius={[6, 6, 0, 0]} name="Certificates Checked">
                    {analytics.verification_outcomes.map((entry, index) => (
                      <Cell key={`bar-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </div>

        {/* Chart 4: Common Deficiency Categories */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Most Frequent Regulatory Deficiencies</h3>
              <p className="text-xs text-slate-500">Aggregated finding frequencies across reviewed dossiers</p>
            </div>
          </div>
          <div className="h-64">
            {analytics?.deficiency_breakdown ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={analytics.deficiency_breakdown}
                  margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" fontSize={11} stroke="#94a3b8" />
                  <YAxis type="category" dataKey="name" fontSize={10} stroke="#475569" width={140} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                  <Bar dataKey="count" fill="#dc2626" radius={[0, 6, 6, 0]} name="Occurrences" />
                </BarChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </div>
      </div>

      {/* Recent Applications Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Table Header & Controls */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-base text-slate-900">Recent Technical Institutional Applications</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Showing {filteredApps.length} total applications matching active filters
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-600 w-44"
              />
            </div>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-600 font-medium text-slate-700"
            >
              <option value="All">All Categories</option>
              <option value="Extension of Approval (EoA)">Extension of Approval (EoA)</option>
              <option value="Change in Approved Intake">Change in Approved Intake</option>
              <option value="New Course Approval">New Course Approval</option>
              <option value="Programme Expansion">Programme Expansion</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-600 font-medium text-slate-700"
            >
              <option value="All">All Statuses</option>
              <option value="Checks Passed">Checks Passed</option>
              <option value="Deficiencies Found">Deficiencies Found</option>
              <option value="Manual Review Required">Manual Review Required</option>
              <option value="Verification Pending">Verification Pending</option>
              <option value="Submitted">Submitted</option>
              <option value="Draft">Draft</option>
            </select>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Application ID</th>
                <th className="py-3 px-4">Institution Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Submission Date</th>
                <th className="py-3 px-4">Validation Status</th>
                <th className="py-3 px-4 text-center">Docs</th>
                <th className="py-3 px-4 text-center">Findings</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedApps.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No applications found matching the selected filters.
                  </td>
                </tr>
              ) : (
                paginatedApps.map((app) => {
                  const docCount = app.documents?.length ?? 0;
                  const findingCount = app.findings?.length ?? 0;
                  const hasCritical = app.findings?.some((f) => f.severity === 'critical');

                  return (
                    <tr
                      key={app.id}
                      onClick={() => navigate(`/applications/${app.id}`)}
                      className="hover:bg-blue-50/40 cursor-pointer transition-colors group"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-blue-600">
                        {app.application_number}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        <div>{app.institution_name}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">Code: {app.institution_code}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{app.category}</td>
                      <td className="py-3 px-4 text-slate-500">
                        {app.submission_date
                          ? new Date(app.submission_date).toLocaleDateString([], {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })
                          : 'Draft In-Progress'}
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(app.status)}</td>
                      <td className="py-3 px-4 text-center font-semibold text-slate-700">
                        <span className="px-2 py-0.5 bg-slate-100 rounded-md">{docCount}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {findingCount > 0 ? (
                          <span
                            className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                              hasCritical ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {findingCount}
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-bold text-[11px]">0</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-xs font-semibold text-blue-600 group-hover:text-blue-800 inline-flex items-center gap-1">
                          Inspect Dossier <ArrowUpRight className="w-3.5 h-3.5" />
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div>
            Page <span className="font-semibold text-slate-800">{currentPage}</span> of{' '}
            <span className="font-semibold text-slate-800">{totalPages}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
