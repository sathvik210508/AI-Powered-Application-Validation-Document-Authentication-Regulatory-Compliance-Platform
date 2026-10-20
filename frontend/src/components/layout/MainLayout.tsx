import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  FileCheck2,
  ShieldAlert,
  BarChart3,
  History,
  Settings,
  Scale,
  LogOut,
  Bell,
  Search,
  CheckCircle2,
  ChevronDown,
  Building2,
  UserCheck,
  UserCog,
  AlertCircle,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { api } from '../../services/api';

export const MainLayout: React.FC = () => {
  const { user, logout, switchRole } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [globalSearch, setGlobalSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    // Fetch recent audit logs as live notifications
    const loadNotifs = async () => {
      try {
        const logs = await api.getAuditTrail({ limit: '6' });
        setNotifications(logs);
      } catch {
        // Fallback
      }
    };
    loadNotifs();
    const interval = setInterval(loadNotifs, 20000);
    return () => clearInterval(interval);
  }, []);

  const handleGlobalSearch = async (val: string) => {
    setGlobalSearch(val);
    if (!val.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    try {
      const apps = await api.getApplications({ search: val });
      setSearchResults(apps.slice(0, 5));
    } catch {
      setSearchResults([]);
    }
  };

  const navItems = [
    { name: 'Overview', path: '/overview', icon: LayoutDashboard },
    { name: 'Applications', path: '/applications', icon: FileText },
    { name: 'Document Verification', path: '/verification', icon: FileCheck2 },
    { name: 'Compliance Review', path: '/compliance', icon: Scale },
    { name: 'Anomaly Detection', path: '/anomalies', icon: ShieldAlert },
    { name: 'Reports & Analytics', path: '/reports', icon: BarChart3 },
    { name: 'Audit Trail', path: '/audit', icon: History },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased">
      {/* Official Top Ministry Banner */}
      <div className="bg-slate-900 text-slate-300 text-xs px-4 py-1.5 flex flex-wrap items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-white tracking-wide">भारत सरकार | Government of India</span>
          <span className="hidden md:inline text-slate-500">|</span>
          <span className="hidden md:inline text-slate-300">All India Council for Technical Education (AICTE)</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="bg-amber-500/20 text-amber-300 text-[11px] font-medium px-2 py-0.5 rounded border border-amber-500/30">
            Prototype Demonstration Environment
          </span>
          <span className="text-slate-400">AY 2026-27</span>
        </div>
      </div>

      {/* Main Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo & Platform Name */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div
              onClick={() => navigate('/overview')}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-900 to-indigo-950 flex items-center justify-center text-white font-bold shadow-md shadow-blue-950/20 group-hover:scale-105 transition-transform">
                <Scale className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-base tracking-tight text-slate-900">
                    AICTE <span className="text-blue-600">SmartValidate</span>
                  </span>
                  <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full border border-blue-200 uppercase tracking-wider">
                    v1.0 AI
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                  Regulatory Compliance & Document Authentication Platform
                </p>
              </div>
            </div>
          </div>

          {/* Global Application Search Bar with quick dropdown */}
          <div className="relative flex-1 max-w-md hidden md:block">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search Application ID, Institution Name, or Code..."
                value={globalSearch}
                onChange={(e) => handleGlobalSearch(e.target.value)}
                onBlur={() => setTimeout(() => setIsSearching(false), 250)}
                onFocus={() => globalSearch.trim() && setIsSearching(true)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-slate-100/80 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all placeholder:text-slate-400"
              />
              {globalSearch && (
                <button
                  onClick={() => handleGlobalSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-semibold"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Search Dropdown Results */}
            {isSearching && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden z-50">
                <div className="p-2 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Applications ({searchResults.length})
                </div>
                {searchResults.length === 0 ? (
                  <div className="p-4 text-center text-sm text-slate-500">
                    No institutional applications found matching "{globalSearch}"
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {searchResults.map((res) => (
                      <div
                        key={res.id}
                        onClick={() => {
                          navigate(`/applications/${res.id}`);
                          setIsSearching(false);
                          setGlobalSearch('');
                        }}
                        className="p-3 hover:bg-slate-50 cursor-pointer flex items-center justify-between transition-colors"
                      >
                        <div>
                          <div className="font-semibold text-sm text-slate-900">{res.institution_name}</div>
                          <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-blue-600 font-medium">{res.application_number}</span>
                            <span>•</span>
                            <span>{res.category}</span>
                          </div>
                        </div>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {res.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-3">
            {/* Live Notifications Popover */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
                title="Activity Notifications"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full ring-2 ring-white animate-pulse" />
              </button>

              {showNotifications && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden z-50">
                  <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <span className="font-semibold text-sm text-slate-900">Audit & Validation Events</span>
                    <button
                      onClick={() => navigate('/audit')}
                      className="text-xs font-medium text-blue-600 hover:text-blue-800"
                    >
                      View All Logs
                    </button>
                  </div>
                  <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-sm text-slate-500">No recent notifications</div>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} className="p-3 hover:bg-slate-50 transition-colors text-xs">
                          <div className="flex items-center justify-between font-semibold text-slate-800">
                            <span>{n.action.replace(/_/g, ' ')}</span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-slate-600 mt-1 line-clamp-2">{n.details}</p>
                          <div className="mt-1 text-[10px] text-slate-400">By {n.actor_name} ({n.actor_role})</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Demo Role Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50 text-slate-700 text-xs font-medium hover:bg-slate-100 transition-all shadow-2xs"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="hidden sm:inline text-slate-500">Role:</span>
                <span className="font-bold text-slate-900 capitalize">
                  {user?.role === 'institution' ? 'Institution User' : user?.role === 'reviewer' ? 'AICTE Reviewer' : 'Administrator'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {showRoleDropdown && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl border border-slate-200 shadow-xl p-2 z-50">
                  <div className="px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Switch Demo Persona
                  </div>
                  <button
                    onClick={() => {
                      switchRole('institution');
                      setShowRoleDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center gap-2.5 hover:bg-slate-100 transition-colors ${
                      user?.role === 'institution' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700'
                    }`}
                  >
                    <Building2 className="w-4 h-4 text-blue-600" />
                    <div>
                      <div>Institution User</div>
                      <div className="text-[10px] text-slate-500 font-normal">Create apps, upload docs</div>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      switchRole('reviewer');
                      setShowRoleDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center gap-2.5 hover:bg-slate-100 transition-colors ${
                      user?.role === 'reviewer' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700'
                    }`}
                  >
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                    <div>
                      <div>AICTE Reviewer</div>
                      <div className="text-[10px] text-slate-500 font-normal">Inspect findings, verify, observations</div>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      switchRole('admin');
                      setShowRoleDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center gap-2.5 hover:bg-slate-100 transition-colors ${
                      user?.role === 'admin' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700'
                    }`}
                  >
                    <UserCog className="w-4 h-4 text-indigo-600" />
                    <div>
                      <div>Administrator</div>
                      <div className="text-[10px] text-slate-500 font-normal">Manage rules, audit logs, reset demo</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* User Profile / Logout */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                {user?.full_name ? user.full_name.charAt(0) : 'U'}
              </div>
              <button
                onClick={logout}
                className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Body Layout: Sidebar + Main Content */}
      <div className="flex-1 flex max-w-full">
        {/* Left Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 top-[89px] z-20 w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 transition-transform duration-200 lg:static lg:translate-x-0 ${
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Navigation Links */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            <div className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Verification Workspace
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Institutional Context Card */}
          <div className="p-3 border-t border-slate-800 bg-slate-950/50 m-2 rounded-xl text-xs">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Active Context
            </div>
            <div className="font-semibold text-white truncate">{user?.full_name}</div>
            <div className="text-[11px] text-slate-400 truncate mt-0.5">{user?.institution_name || 'AICTE Regulatory Bureau'}</div>
            <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <span>Security Level:</span>
              <span className="font-mono text-emerald-400 font-semibold">TLS-SHA256</span>
            </div>
          </div>
        </aside>

        {/* Backdrop for mobile drawer */}
        {isMobileMenuOpen && (
          <div
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-10 lg:hidden"
          />
        )}

        {/* Main Workspace Area */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
