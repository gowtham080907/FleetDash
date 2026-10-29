import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Settings, UserCheck } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

export const SettingsPage: React.FC = () => {
  const { user, isDemoMode } = useAuthStore();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Settings className="w-5 h-5 text-brand-electric" />
          System Configuration & Controls
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Telemetry stream rates, socket endpoints, role permissions, and display preferences.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-500" />
              Active Operator Session
            </CardTitle>
            <CardDescription>Current user profile credentials and permissions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400 block">Operator Name</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{user?.name || 'Unassigned'}</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block">Email Address</span>
              <span className="font-mono text-slate-800 dark:text-slate-200">{user?.email || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block">Role & Permission Tier</span>
              <span className="inline-block px-2 py-0.5 mt-0.5 rounded bg-blue-500/10 text-brand-electric font-semibold uppercase">
                {user?.role?.replace('_', ' ') || 'Fleet Manager'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Environment Settings</CardTitle>
            <CardDescription>Network endpoints and simulation mode status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400 block">Operating Mode</span>
              <span className="font-semibold text-amber-500">
                {isDemoMode ? 'Demo Simulator Mode' : 'Production Backend Connected'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block">Socket Server URL</span>
              <span className="font-mono text-slate-800 dark:text-slate-200">
                {import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block">API Base URL</span>
              <span className="font-mono text-slate-800 dark:text-slate-200">
                {import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
