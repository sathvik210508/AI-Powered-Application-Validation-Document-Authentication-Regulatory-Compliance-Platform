import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scale, ShieldCheck, Building2, UserCheck, UserCog, ArrowRight, Lock, Mail, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsSubmitting(true);
    const success = await login(email, password);
    setIsSubmitting(false);
    if (success) {
      navigate('/overview');
    }
  };

  const handleQuickLogin = async (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setIsSubmitting(true);
    const success = await login(demoEmail, demoPass);
    setIsSubmitting(false);
    if (success) {
      navigate('/overview');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-between antialiased selection:bg-blue-600 selection:text-white">
      {/* Top Ministry header */}
      <div className="bg-slate-950 border-b border-slate-800 text-slate-400 text-xs py-2 px-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-200">भारत सरकार | Government of India</span>
          <span>•</span>
          <span>All India Council for Technical Education (AICTE)</span>
        </div>
        <div className="text-amber-400 font-medium">Smart India Hackathon Prototype Edition</div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl w-full grid md:grid-cols-5 gap-8 items-center">
          
          {/* Left Column: Product Showcase & Vision */}
          <div className="md:col-span-2 text-white space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span>SIH Hackathon Problem Statement</span>
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
                AICTE <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300">SmartValidate</span>
              </h1>
              <p className="mt-3 text-sm text-slate-400 leading-relaxed">
                Next-generation decision-support platform for technical institution Extension of Approval (EoA), AI document validation, anomaly detection & regulatory compliance.
              </p>
            </div>

            <div className="space-y-3 pt-2 text-xs text-slate-300">
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-md bg-blue-900/60 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">✓</div>
                <span>Automated PDF & Scanned Document OCR Extraction</span>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-md bg-blue-900/60 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">✓</div>
                <span>Deterministic Simulated Issuing Authority Gateway</span>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-md bg-blue-900/60 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">✓</div>
                <span>Multi-Signal Anomaly Scoring & SHA-256 Duplication Check</span>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-md bg-blue-900/60 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">✓</div>
                <span>Immutable Regulatory Audit Trail & Evidence-Linked Dashboard</span>
              </div>
            </div>
          </div>

          {/* Right Column: Login Card & Demo Personas */}
          <div className="md:col-span-3 bg-white rounded-2xl shadow-2xl p-6 sm:p-8 border border-slate-200">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900">Sign in to Verification Portal</h2>
              <p className="text-xs text-slate-500 mt-1">
                Enter authorized credentials or select a convenient sample role below.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Official Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="official@aicte.gov.in"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Authenticating...' : 'Sign In to Portal'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Quick Demo Login Cards */}
            <div className="mt-6 pt-5 border-t border-slate-100">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                <span>1-Click Demo Evaluation Roles</span>
                <span className="text-blue-600 lowercase font-normal">Click to sign in</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('institution@demo.aicte.gov.in', 'Demo@123')}
                  className="p-2.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 text-left transition-all group"
                >
                  <Building2 className="w-4 h-4 text-blue-600 mb-1 group-hover:scale-110 transition-transform" />
                  <div className="text-xs font-bold text-slate-900">Institution</div>
                  <div className="text-[10px] text-slate-500">Dr. Ramesh Sharma</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('reviewer@aicte.gov.in', 'Reviewer@123')}
                  className="p-2.5 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 text-left transition-all group"
                >
                  <UserCheck className="w-4 h-4 text-emerald-600 mb-1 group-hover:scale-110 transition-transform" />
                  <div className="text-xs font-bold text-slate-900">AICTE Reviewer</div>
                  <div className="text-[10px] text-slate-500">Shri Alok Verma</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('admin@aicte.gov.in', 'Admin@123')}
                  className="p-2.5 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 text-left transition-all group"
                >
                  <UserCog className="w-4 h-4 text-indigo-600 mb-1 group-hover:scale-110 transition-transform" />
                  <div className="text-xs font-bold text-slate-900">Administrator</div>
                  <div className="text-[10px] text-slate-500">Prof. Sunita Rao</div>
                </button>
              </div>
            </div>

            <div className="mt-4 p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 text-[11px] text-slate-500 flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <span>Demo sandbox is pre-populated with 7 realistic compliance scenarios (Scenarios A through G).</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-slate-950 border-t border-slate-800 text-slate-500 text-xs py-3 text-center">
        All India Council for Technical Education (AICTE), Nelson Mandela Marg, Vasant Kunj, New Delhi - 110070
      </div>
    </div>
  );
};
