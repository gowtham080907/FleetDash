import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  MapPin,
  Truck,
  Activity,
  ShieldAlert,
  Bell,
  Gauge,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Radio,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/utils/cn';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

interface NavItem {
  title: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const navItems: NavItem[] = [
  { title: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { title: 'Live Map', path: '/live-map', icon: MapPin },
  { title: 'Vehicles', path: '/vehicles', icon: Truck },
  { title: 'Telemetry', path: '/telemetry', icon: Activity },
  { title: 'Geofences', path: '/geofences', icon: ShieldAlert },
  { title: 'Alerts', path: '/alerts', icon: Bell },
  { title: 'Performance', path: '/performance', icon: Gauge },
  { title: 'Settings', path: '/settings', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
}) => {
  const { logout, user } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between bg-brand-navy-dark text-slate-300 border-r border-slate-800 select-none">
      {/* Brand Header */}
      <div>
        <div className="flex h-16 items-center justify-between px-4 border-b border-slate-800/80">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-electric text-white shadow-md shadow-blue-500/20">
              <Radio className="h-5 w-5 animate-pulse" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col truncate">
                <span className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                  FLEET<span className="text-brand-electric">DASH</span>
                </span>
                <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">
                  Telemetry Engine
                </span>
              </div>
            )}
          </div>

          {/* Desktop collapse toggle */}
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-white transition"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onCloseMobile}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all group relative',
                    isActive
                      ? 'bg-brand-electric text-white shadow-sm shadow-blue-500/30 font-semibold'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
                  )
                }
                title={isCollapsed ? item.title : undefined}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!isCollapsed && <span className="truncate">{item.title}</span>}
                {isCollapsed && (
                  <div className="fixed left-20 hidden rounded-md bg-slate-900 px-2 py-1 text-xs text-white shadow-md group-hover:block z-50 whitespace-nowrap">
                    {item.title}
                  </div>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* User Info & Logout Footer */}
      <div className="p-3 border-t border-slate-800/80">
        {!isCollapsed && user && (
          <div className="mb-3 px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800/60 flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
              {user.name.charAt(0)}
            </div>
            <div className="truncate flex-1">
              <p className="text-xs font-semibold text-slate-200 truncate">{user.name}</p>
              <p className="text-[10px] text-slate-400 capitalize truncate">{user.role.replace('_', ' ')}</p>
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition group',
            isCollapsed && 'justify-center px-0'
          )}
          title={isCollapsed ? 'Log out' : undefined}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!isCollapsed && <span>Log out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden lg:block shrink-0 transition-all duration-300 ease-in-out z-30 sticky top-0 h-screen',
          isCollapsed ? 'w-18' : 'w-64'
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Mobile Drawer */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 transform bg-brand-navy-dark transition-transform duration-300 ease-in-out lg:hidden',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {sidebarContent}
      </div>
    </>
  );
};
