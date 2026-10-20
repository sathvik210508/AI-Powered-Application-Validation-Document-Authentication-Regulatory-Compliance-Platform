import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileCheck2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  ShieldAlert,
  Search,
  Filter,
  Eye,
  X,
  Building2,
  Info
} from 'lucide-react';
import { api } from '../services/api';
import { VerificationRecord } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const VerificationPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [verifications, setVerifications] = useState<VerificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [inspectingItem, setInspectingItem] = useState<VerificationRecord | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await api.getVerifications();
      setVerifications(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load verification records', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleVerify = async (id: number) => {
    try {
      showToast('Contacting simulated issuing authority portal...', 'info');
      const res = await api.verifyDocument(id);
      showToast(`Verification completed: ${res.status}`, res.status === 'Verified' ? 'success' : 'warning');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Verification call failed', 'error');
    }
  };

  const filtered = verifications.filter((v) => {
    const matchesStatus = statusFilter === 'All' || v.status === statusFilter;
    const matchesSearch =
      (v.application_number || '').toLowerCase().includes(search.toLowerCase()) ||
      (v.institution_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (v.document_type || '').toLowerCase().includes(search.toLowerCase()) ||
      (v.issuing_authority || '').toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const counts = {
    total: verifications.length,
    verified: verifications.filter((v) => v.status === 'Verified').length,
    mismatch: verifications.filter((v) => v.status === 'Mismatch Detected').length,
    expired: verifications.filter((v) => v.status === 'Expired').length,
    unavailable: verifications.filter((v) => v.status === 'Source Unavailable').length,
    pending: verifications.filter((v) => v.status === 'Verification Pending').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Issuing Authority Document Verification Gateway
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Automated integration with university affiliation registers, fire services, and municipal registries.
          </p>
        </div>
        <button
          onClick={loadData}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Gateway Records
        </button>
      </div>

      {/* Authority Notice */}
      <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-2xl text-xs text-blue-900 flex items-start gap-3">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Simulated Multi-Authority Verification Adapter:</span> In this local prototype, official certificate lookups query synthetic university and government registries to deterministically demonstrate valid certificates, mismatch detection, expired credentials, and gateway timeouts.
        </div>
      </div>

      {/* Outcome Status Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div
          onClick={() => setStatusFilter('All')}
          className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
            statusFilter === 'All' ? 'bg-blue-900 text-white shadow-md' : 'bg-white border-slate-200 text-slate-700'
          }`}
        >
          <div className="text-[11px] font-semibold opacity-80">Total Tracked</div>
          <div className="text-2xl font-extrabold mt-1">{counts.total}</div>
        </div>

        <div
          onClick={() => setStatusFilter('Verified')}
          className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
            statusFilter === 'Verified' ? 'bg-emerald-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-700'
          }`}
        >
          <div className="text-[11px] font-semibold text-emerald-700">Verified</div>
          <div className="text-2xl font-extrabold text-emerald-800 mt-1">{counts.verified}</div>
        </div>

        <div
          onClick={() => setStatusFilter('Mismatch Detected')}
          className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
            statusFilter === 'Mismatch Detected' ? 'bg-rose-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-700'
          }`}
        >
          <div className="text-[11px] font-semibold text-rose-700">Mismatch Detected</div>
          <div className="text-2xl font-extrabold text-rose-800 mt-1">{counts.mismatch}</div>
        </div>

        <div
          onClick={() => setStatusFilter('Expired')}
          className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
            statusFilter === 'Expired' ? 'bg-amber-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-700'
          }`}
        >
          <div className="text-[11px] font-semibold text-amber-700">Expired</div>
          <div className="text-2xl font-extrabold text-amber-800 mt-1">{counts.expired}</div>
        </div>

        <div
          onClick={() => setStatusFilter('Source Unavailable')}
          className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
            statusFilter === 'Source Unavailable' ? 'bg-purple-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-700'
          }`}
        >
          <div className="text-[11px] font-semibold text-purple-700">Source Down</div>
          <div className="text-2xl font-extrabold text-purple-800 mt-1">{counts.unavailable}</div>
        </div>

        <div
          onClick={() => setStatusFilter('Verification Pending')}
          className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
            statusFilter === 'Verification Pending' ? 'bg-blue-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-700'
          }`}
        >
          <div className="text-[11px] font-semibold text-blue-700">Pending Lookup</div>
          <div className="text-2xl font-extrabold text-blue-800 mt-1">{counts.pending}</div>
        </div>
      </div>

      {/* Verification Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Filter by authority, institution or cert..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <div className="text-xs text-slate-500">
            Showing <strong className="text-slate-800">{filtered.length}</strong> items
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Application & Institution</th>
                <th className="py-3 px-4">Document Type</th>
                <th className="py-3 px-4">Issuing Authority</th>
                <th className="py-3 px-4">Verification Outcome</th>
                <th className="py-3 px-4">Summary Observation</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No verification records match the selected filter.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4">
                      <div
                        onClick={() => navigate(`/applications/${item.application_id}`)}
                        className="font-bold text-blue-600 hover:underline cursor-pointer"
                      >
                        {item.institution_name}
                      </div>
                      <div className="font-mono text-[10px] text-slate-400 mt-0.5">
                        {item.application_number}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      <div>{item.document_type}</div>
                      <div className="text-[10px] text-slate-400">{item.filename}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      <div className="font-semibold">{item.issuing_authority}</div>
                      <div className="text-[10px] text-slate-400 font-mono">Adapter: {item.verification_method}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          item.status === 'Verified'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : item.status === 'Mismatch Detected'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : item.status === 'Expired'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : item.status === 'Source Unavailable'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={item.response_summary}>
                      {item.response_summary || 'Lookup pending.'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setInspectingItem(item)}
                          className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        >
                          Inspect JSON
                        </button>
                        {(user?.role === 'reviewer' || user?.role === 'admin') && (
                          <button
                            onClick={() => handleVerify(item.id)}
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

      {/* Inspect JSON Modal */}
      {inspectingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-base text-slate-900">Authority Response Inspection</h3>
                <p className="text-xs text-slate-500">{inspectingItem.issuing_authority}</p>
              </div>
              <button onClick={() => setInspectingItem(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3 font-mono text-xs max-h-96 overflow-y-auto">
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Authority Payload
                </div>
                <pre className="p-3 bg-slate-900 text-emerald-400 rounded-xl text-[11px] overflow-x-auto">
                  {JSON.stringify(
                    typeof inspectingItem.response_payload === 'string'
                      ? JSON.parse(inspectingItem.response_payload || '{}')
                      : inspectingItem.response_payload,
                    null,
                    2
                  )}
                </pre>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setInspectingItem(null)}
                className="px-4 py-2 bg-slate-900 text-white font-semibold rounded-xl text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
