import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Menu,
  Search,
  Bell,
  Sun,
  Moon,
  ChevronDown,
  Info,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useThemeStore } from '@/stores/themeStore';
import { useAuthStore } from '@/stores/authStore';
import { StatusBadge } from '@/components/ui/StatusBadge';

import { socketService, SocketConnectionStatus } from '@/services/socket/socketService';

interface TopNavbarProps {
  onToggleMobileSidebar: () => void;
}

const pageTitles: Record<string, string> = {
  '/dashboard': 'Executive Telemetry Dashboard',
  '/live-map': 'Real-Time Fleet Geospace Map',
  '/vehicles': 'Vehicle Fleet Registry',
  '/telemetry': 'High-Frequency Telemetry Ingestion',
  '/geofences': 'Geofencing & Boundary Management',
  '/alerts': 'Security & Geofence Alerts Feed',
  '/performance': 'Pipeline & Canvas Engine Diagnostics',
  '/settings': 'System Configuration & Controls',
};

export const TopNavbar: React.FC<TopNavbarProps> = ({
  onToggleMobileSidebar,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { effectiveTheme, toggleTheme } = useThemeStore();
  const { user, logout, isDemoMode } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [socketStatus, setSocketStatus] = useState<SocketConnectionStatus>(socketService.getStatus());

  useEffect(() => {
    socketService.connect();
    const unsub = socketService.onStatusChange((s) => setSocketStatus(s));
    return unsub;
  }, []);

  const currentTitle = pageTitles[location.pathname] || 'Fleet Operations';

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/vehicles?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-md transition-colors dark:border-slate-800 dark:bg-slate-900/90 sm:px-6">
      {/* Left: Mobile hamburger & Page Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileSidebar}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 lg:hidden"
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open mobile navigation</span>
        </button>

        <div className="flex flex-col">
          <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            {currentTitle}
          </h1>
        </div>
      </div>

      {/* Center: Global Search & Demo Badge */}
      <div className="flex items-center gap-3">
        {/* Demo Mode Badge */}
        {isDemoMode && (
          <div
            className="flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400 shadow-sm"
            title="Application is running with simulated deterministic telemetry"
          >
            <Zap className="h-3 w-3 fill-amber-500 text-amber-500 animate-pulse" />
            <span>DEMO MODE</span>
          </div>
        )}

        {/* Global Vehicle Search */}
        <form onSubmit={handleSearchSubmit} className="hidden md:flex relative items-center">
          <Search className="absolute left-3 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search vehicle ID (e.g. VH-102)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-60 lg:w-72 rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-brand-electric focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-electric dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:bg-slate-900 transition"
          />
        </form>
      </div>

      {/* Right: Socket Status, Theme Switcher, Notifications, Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Socket Status Indicator */}
        <div className="hidden sm:flex items-center">
          <StatusBadge
            status={socketStatus === 'connected' ? 'connected' : socketStatus === 'connecting' ? 'connecting' : 'disconnected'}
            label={socketStatus === 'connected' ? 'WS LIVE' : socketStatus === 'connecting' ? 'WS CONNECTING' : 'WS OFFLINE'}
            pulse={socketStatus === 'connected' || socketStatus === 'connecting'}
          />
        </div>

        {/* Theme Switcher */}
        <button
          onClick={toggleTheme}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
          title={`Switch to ${effectiveTheme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {effectiveTheme === 'dark' ? (
            <Sun className="h-4 w-4 text-amber-400" />
          ) : (
            <Moon className="h-4 w-4 text-slate-600" />
          )}
          <span className="sr-only">Toggle theme</span>
        </button>

        {/* Notification Bell */}
        <button
          onClick={() => navigate('/alerts')}
          className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
          title="View Alert Feed"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
          </span>
          <span className="sr-only">Notifications</span>
        </button>

        {/* Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2 rounded-lg p-1 text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition"
          >
            <div className="h-8 w-8 rounded-full bg-brand-navy dark:bg-slate-700 text-white flex items-center justify-center text-xs font-bold ring-2 ring-brand-electric/30">
              {user?.name ? user.name.charAt(0) : 'U'}
            </div>
            <ChevronDown className="h-3 w-3 text-slate-400 hidden sm:block" />
          </button>

          {isProfileOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setIsProfileOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-slate-900 z-40 animate-in fade-in zoom-in-95">
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{user?.name || 'Operator'}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user?.email || 'operator@fleetdash.io'}</p>
                  <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                    <ShieldCheck className="w-3 h-3" />
                    <span>{user?.role?.replace('_', ' ').toUpperCase() || 'MANAGER'}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    navigate('/settings');
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition text-left"
                >
                  <Info className="h-3.5 w-3.5" />
                  <span>Account & System Settings</span>
                </button>

                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    logout();
                    navigate('/login');
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30 transition text-left"
                >
                  <span>Sign out</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
