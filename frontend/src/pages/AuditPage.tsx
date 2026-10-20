import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  Filter,
  RefreshCw,
  ShieldCheck,
  Lock,
  User,
  Calendar,
  Layers,
  ArrowDownUp
} from 'lucide-react';
import { api } from '../services/api';
import { AuditLog } from '../types';
import { useToast } from '../context/ToastContext';

export const AuditPage: React.FC = () => {
  const { showToast } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [actionFilter, setActionFilter] = useState('All');

  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await api.getAuditTrail({
        actor_role: roleFilter,
        action: actionFilter,
        search: search.trim()
      });
      setLogs(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch audit events', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [roleFilter, actionFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadLogs();
  };

  const getActionBadge = (action: string) => {
    let color = 'bg-slate-100 text-slate-700 border-slate-200';
    if (action.includes('SUBMITTED') || action.includes('APPROVED')) {
      color = 'bg-emerald-50 text-emerald-800 border-emerald-200';
    } else if (action.includes('ANOMALY') || action.includes('DEFICIENCY') || action.includes('RECTIFICATION')) {
      color = 'bg-rose-50 text-rose-800 border-rose-200';
    } else if (action.includes('VALIDATION') || action.includes('VERIFIED')) {
      color = 'bg-blue-50 text-blue-800 border-blue-200';
    } else if (action.includes('RESET')) {
      color = 'bg-purple-50 text-purple-800 border-purple-200';
    }
    return (
      <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold border ${color}`}>
        {action}
      </span>
    );
  };

  const getRoleBadge = (role: string) => {
    const map: Record<string, string> = {
      institution: 'bg-blue-50 text-blue-700 border-blue-200',
      reviewer: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      admin: 'bg-purple-50 text-purple-700 border-purple-200',
      system: 'bg-slate-100 text-slate-700 border-slate-300',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize ${map[role] || map['system']}`}>
        {role}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Immutable Regulatory Audit Trail
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Append-only tamper-evident verification ledger for all application events, validations, and administrative actions.
          </p>
        </div>
        <button
          onClick={loadLogs}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Audit Trail
        </button>
      </div>

      {/* Security Banner */}
      <div className="p-3.5 bg-slate-900 text-white rounded-2xl border border-slate-800 text-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            <strong>Statutory Compliance Notice:</strong> In accordance with government IT auditing standards, audit records are strictly append-only and cannot be altered or removed through user interfaces.
          </span>
        </div>
        <span className="font-mono text-[11px] text-emerald-400 font-bold shrink-0 hidden md:block">
          ENCRYPTED-LOGS • SHA256
        </span>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search details, actor, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-600"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto text-xs">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none"
          >
            <option value="All">All Roles</option>
            <option value="institution">Institution User</option>
            <option value="reviewer">AICTE Reviewer</option>
            <option value="admin">Administrator</option>
            <option value="system">System Automated</option>
          </select>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none"
          >
            <option value="All">All Event Types</option>
            <option value="APPLICATION_CREATED">Application Created</option>
            <option value="APPLICATION_SUBMITTED">Application Submitted</option>
            <option value="DOCUMENT_UPLOADED">Document Uploaded</option>
            <option value="AUTOMATED_VALIDATION_COMPLETED">Automated Validation Completed</option>
            <option value="DOCUMENT_VERIFIED">Document Verified</option>
            <option value="FINDING_REVIEWED">Finding Reviewed</option>
            <option value="DECISION_RECORDED">Decision Recorded</option>
            <option value="SYSTEM_RESET">System Reset</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Timestamp (UTC)</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Action Type</th>
                <th className="py-3 px-4">Event Details</th>
                <th className="py-3 px-4 font-mono">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No audit records found matching the active filters.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString([], {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      <div>{log.actor_name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{log.actor_email}</div>
                    </td>
                    <td className="py-3 px-4">{getRoleBadge(log.actor_role)}</td>
                    <td className="py-3 px-4">{getActionBadge(log.action)}</td>
                    <td className="py-3 px-4 text-slate-700 max-w-md leading-relaxed">{log.details}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">{log.ip_address}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
