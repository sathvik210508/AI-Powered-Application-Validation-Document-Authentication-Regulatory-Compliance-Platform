import React, { useState, useEffect } from 'react';
import {
  Scale,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Users,
  Eye,
  Camera,
  Layers,
  X
} from 'lucide-react';
import { api } from '../services/api';
import { ComplianceRule, ComplianceItem, Application } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const CompliancePage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'review' | 'rules'>('review');
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<number | null>(null);
  const [complianceItems, setComplianceItems] = useState<ComplianceItem[]>([]);
  const [rules, setRules] = useState<ComplianceRule[]>([]);
  const [loading, setLoading] = useState(true);

  // New Rule Modal
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [newRule, setNewRule] = useState({
    code: '',
    name: '',
    description: '',
    category: 'Infrastructure',
    required_evidence: '',
    validation_conditions: '{}',
    effective_version: 'AICTE APH 2026-27'
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [appsData, rulesData] = await Promise.all([
        api.getApplications(),
        api.getComplianceRules()
      ]);
      setApplications(appsData);
      setRules(rulesData);
      if (appsData.length > 0 && !selectedAppId) {
        setSelectedAppId(appsData[0].id);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load compliance data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedAppId) {
      const loadAppItems = async () => {
        try {
          const items = await api.getApplicationCompliance(selectedAppId);
          setComplianceItems(items);
        } catch {
          setComplianceItems([]);
        }
      };
      loadAppItems();
    }
  }, [selectedAppId]);

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createComplianceRule(newRule);
      showToast(`Rule ${newRule.code} created successfully!`, 'success');
      setShowRuleModal(false);
      setNewRule({
        code: '',
        name: '',
        description: '',
        category: 'Infrastructure',
        required_evidence: '',
        validation_conditions: '{}',
        effective_version: 'AICTE APH 2026-27'
      });
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to create rule', 'error');
    }
  };

  const handleToggleRule = async (id: number, currentActive: boolean) => {
    try {
      await api.updateComplianceRule(id, { is_active: !currentActive });
      showToast(`Rule status updated to ${!currentActive ? 'Active' : 'Disabled'}.`, 'info');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to update rule', 'error');
    }
  };

  const selectedApp = applications.find((a) => a.id === selectedAppId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Regulatory Compliance & Approval Norms Module
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            AICTE Approval Process Handbook (APH) automated checklists and configurable criteria.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {user?.role === 'admin' && (
            <button
              onClick={() => setShowRuleModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Define Regulatory Rule
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 text-xs font-bold">
        <button
          onClick={() => setActiveTab('review')}
          className={`py-2.5 px-4 border-b-2 transition-all cursor-pointer ${
            activeTab === 'review'
              ? 'border-blue-600 text-blue-600 bg-white rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Application Compliance Scrutiny
        </button>
        <button
          onClick={() => setActiveTab('rules')}
          className={`py-2.5 px-4 border-b-2 transition-all cursor-pointer ${
            activeTab === 'rules'
              ? 'border-blue-600 text-blue-600 bg-white rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Configurable Rules Engine ({rules.length})
        </button>
      </div>

      {/* TAB 1: REVIEW */}
      {activeTab === 'review' && (
        <div className="space-y-5">
          {/* Institution Selector */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-semibold text-slate-700">Select Application Dossier:</span>
            </div>
            <select
              value={selectedAppId || ''}
              onChange={(e) => setSelectedAppId(parseInt(e.target.value))}
              className="text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              {applications.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.application_number} — {a.institution_name} ({a.category})
                </option>
              ))}
            </select>
          </div>

          {/* Infrastructure Disclaimer Card */}
          <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl text-xs text-amber-900 flex items-start gap-3">
            <Camera className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Infrastructure Inspection Standard:</span> Geo-tagged photographs and structural layouts demonstrate preliminary evidence completeness. Physical inspection or verified structural engineering certificates remain required before final regulatory sanction.
            </div>
          </div>

          {/* Compliance Checklist Cards */}
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
                  <strong>Submitted Evidence:</strong> {item.submitted_evidence || 'No documentary proof submitted.'}
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

      {/* TAB 2: RULES MANAGER */}
      {activeTab === 'rules' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900">Active Regulatory Rule Definitions</h3>
            <span className="text-xs text-slate-500">Edition: AICTE Approval Process Handbook (APH)</span>
          </div>

          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
              <tr>
                <th className="py-3 px-4">Rule Code</th>
                <th className="py-3 px-4">Requirement Name & Description</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Required Evidence</th>
                <th className="py-3 px-4 text-center">Status</th>
                {user?.role === 'admin' && <th className="py-3 px-4 text-right">Toggle</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rules.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="py-3.5 px-4 font-mono font-bold text-blue-600">{r.code}</td>
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900">{r.name}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5 max-w-md">{r.description}</div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-700 font-medium">{r.category}</td>
                  <td className="py-3.5 px-4 text-slate-600">{r.required_evidence}</td>
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        r.is_active
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {r.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  {user?.role === 'admin' && (
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleToggleRule(r.id, r.is_active)}
                        className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                      >
                        {r.is_active ? 'Deactivate' : 'Enable'}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New Rule Modal */}
      {showRuleModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Define New Regulatory Rule</h3>
              <button onClick={() => setShowRuleModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRule} className="py-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Rule Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. COMP-SPORTS-08"
                    value={newRule.code}
                    onChange={(e) => setNewRule({ ...newRule, code: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={newRule.category}
                    onChange={(e) => setNewRule({ ...newRule, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium"
                  >
                    <option value="Infrastructure">Infrastructure</option>
                    <option value="Faculty Norms">Faculty Norms</option>
                    <option value="Land & Building Norms">Land & Building Norms</option>
                    <option value="Safety & Clearances">Safety & Clearances</option>
                    <option value="Digital Infrastructure">Digital Infrastructure</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Requirement Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Outdoor Sports Ground & Gymnasium Norms"
                  value={newRule.name}
                  onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Detailed Requirement Description</label>
                <textarea
                  rows={2}
                  required
                  placeholder="State the prescribed statutory parameters..."
                  value={newRule.description}
                  onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Required Documentary Evidence</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Certified Layout Plan & Geo-tagged Photographs"
                  value={newRule.required_evidence}
                  onChange={(e) => setNewRule({ ...newRule, required_evidence: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRuleModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl cursor-pointer"
                >
                  Save & Publish Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
