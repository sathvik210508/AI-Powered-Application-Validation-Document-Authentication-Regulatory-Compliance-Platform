import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings as SettingsIcon,
  RotateCcw,
  ShieldCheck,
  Server,
  Layers,
  Database,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Info,
  X
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [settings, setSettings] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [showResetModal, setShowResetModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await api.getSettings();
      setSettings(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleResetDemo = async () => {
    try {
      setIsResetting(true);
      await api.resetDemoData(true);
      showToast('Demo data reset successfully! Scenarios A through G restored.', 'success');
      setShowResetModal(false);
      navigate('/overview');
    } catch (err: any) {
      showToast(err.message || 'Reset failed', 'error');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          System Configuration & Platform Settings
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          AI engine parameters, issuing authority gateway endpoints, and demo sandbox administration.
        </p>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Environment Status */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
            <Server className="w-4 h-4 text-blue-600" />
            <span>Platform Environment</span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Execution Mode:</span>
              <strong className="text-blue-700">{settings?.environment || 'Evaluation Sandbox'}</strong>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Regulatory Approval Cycle:</span>
              <strong className="text-slate-800">{settings?.academic_cycle || '2026-2027'}</strong>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Database Layer:</span>
              <strong className="text-slate-800">SQLite (PostgreSQL Ready ORM)</strong>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Security Architecture:</span>
              <strong className="text-emerald-700">RBAC Token + SHA-256 Hashes</strong>
            </div>
          </div>
        </div>

        {/* OCR Engine Config */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
            <Cpu className="w-4 h-4 text-emerald-600" />
            <span>Document Processing Engine</span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Active PDF Pipeline:</span>
              <strong className="text-slate-800">pypdf + PyMuPDF Parser</strong>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">OCR Image Engine:</span>
              <strong className="text-slate-800">{settings?.ocr_engine || 'Tesseract / Fallback'}</strong>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">OCR Confidence Threshold:</span>
              <strong className="text-amber-800">65% (Flags for manual scrutiny)</strong>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Field Extraction:</span>
              <strong className="text-blue-700">Regex & Pattern NLP Heuristics</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Issuing Authority Adapters */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
            <Layers className="w-4 h-4 text-blue-600" />
            <span>Configured Issuing Authority Verification Adapters</span>
          </div>
          <span className="text-[11px] text-slate-400">Sandbox Mode Active</span>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {settings?.authority_adapters?.map((adapter: any, idx: number) => (
            <div key={idx} className="py-2.5 flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-800">{adapter.name}</div>
                <div className="text-[11px] text-slate-400">{adapter.type}</div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {adapter.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Admin Actions: Demo Data Reset */}
      {user?.role === 'admin' && (
        <div className="bg-rose-50/50 p-6 rounded-2xl border border-rose-200/80 space-y-3">
          <div className="flex items-center gap-2 font-bold text-sm text-rose-900">
            <RotateCcw className="w-4 h-4 text-rose-600" />
            <span>Administrator Demo Sandbox Reset</span>
          </div>
          <p className="text-xs text-rose-700 leading-relaxed">
            Reset all persisted database records to the baseline demonstration state. This restores the 7 canonical test scenarios (Scenarios A through G) and default audit entries.
          </p>
          <button
            onClick={() => setShowResetModal(true)}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            Reset Demo Database to Initial Scenarios
          </button>
        </div>
      )}

      {/* Reset Confirmation Dialog */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-bold text-lg text-slate-900">Confirm Sandbox Data Reset</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              Are you sure you want to reset the demonstration database? All newly uploaded files, modified parameters, and reviewer observations will be purged and re-seeded with the original demonstration scenarios (A through G).
            </p>
            <div className="flex items-center justify-end gap-2 text-xs">
              <button
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleResetDemo}
                disabled={isResetting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl cursor-pointer"
              >
                {isResetting ? 'Resetting Records...' : 'Yes, Reset Database'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
