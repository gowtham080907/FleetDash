import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Settings, UserCheck, Server, Radio, Shield, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useBackendHealth } from '@/hooks/useFleetData';
import { fleetApi } from '@/services/api/fleetApi';
import { socketService } from '@/services/socket/socketService';
import { useToastStore } from '@/stores/toastStore';
import { useQueryClient } from '@tanstack/react-query';

export const SettingsPage: React.FC = () => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const { data: health, isLoading: isHealthLoading, refetch: refetchHealth } = useBackendHealth();
  const { addToast } = useToastStore();

  const [isDemoMode, setIsDemoMode] = useState(fleetApi.isDemoMode);
  const [socketStatus, setSocketStatus] = useState(socketService.getStatus());
  const token = typeof window !== 'undefined' ? sessionStorage.getItem('fleetdash_jwt_token') : null;

  useEffect(() => {
    const unsub = socketService.onStatusChange((status) => {
      setSocketStatus(status);
    });
    return unsub;
  }, []);

  const handleToggleMode = (mode: boolean) => {
    setIsDemoMode(mode);
    fleetApi.setDemoMode(mode);
    queryClient.invalidateQueries({ queryKey: ['fleet'] });
    addToast({
      type: 'info',
      title: 'Operating Mode Updated',
      message: mode
        ? 'Switched to Deterministic Demo Mode (Simulated Stream).'
        : 'Switched to Live Production Backend API Mode.',
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Settings className="w-5 h-5 text-brand-electric" />
          System Configuration & Diagnostics
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Telemetry stream rates, socket endpoints, role permissions, and backend operational status.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Session Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-500" />
              Active Operator Session
            </CardTitle>
            <CardDescription>Authenticated user credentials and JWT security state</CardDescription>
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
            <div>
              <span className="text-slate-500 dark:text-slate-400 block">JWT Token Status</span>
              <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                <Shield className="w-3.5 h-3.5 text-emerald-500" />
                {token ? `${token.substring(0, 24)}... (Verified)` : 'Active Demo Session'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Backend & Node Health Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Server className="w-4 h-4 text-brand-electric" />
                Backend Service Telemetry Health
              </CardTitle>
              <CardDescription>Live Node.js & Worker Threads cluster diagnostics</CardDescription>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetchHealth()}
              className="h-7 w-7"
              title="Ping Backend"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isHealthLoading ? 'animate-spin' : ''}`} />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3 text-xs pt-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Node API Service</span>
              {health ? (
                <span className="inline-flex items-center gap-1 text-emerald-500 font-bold font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5" /> ONLINE (Uptime: {Math.round(health.uptime)}s)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-500 font-bold font-mono">
                  <AlertCircle className="w-3.5 h-3.5" /> STANDBY / OFFLINE
                </span>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Worker Thread Pool</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                {health ? `${health.worker.activeWorkers} / ${health.worker.poolSize} Worker Threads` : '2 Active (Local)'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Socket.IO Stream</span>
              <span className="font-mono font-bold text-brand-electric flex items-center gap-1">
                <Radio className="w-3.5 h-3.5" />
                {socketStatus === 'connected' ? 'CONNECTED (Binary 32B)' : socketStatus.toUpperCase()}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">API Endpoint</span>
              <span className="font-mono text-slate-800 dark:text-slate-200">
                {import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Operating Mode Selector */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Operating Data Source Mode</CardTitle>
            <CardDescription>
              Toggle between Live Backend REST & WebSocket streams and Offline Deterministic Simulation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                onClick={() => handleToggleMode(false)}
                className={`p-4 rounded-xl border-2 cursor-pointer transition ${
                  !isDemoMode
                    ? 'border-brand-electric bg-blue-500/10'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    Live Production Backend Mode
                  </span>
                  {!isDemoMode && <span className="h-2 w-2 rounded-full bg-brand-electric" />}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Connects to Express.js server, persists vehicles and geofences in the database, processes telemetry via worker threads, and streams binary packets via WebSockets.
                </p>
              </div>

              <div
                onClick={() => handleToggleMode(true)}
                className={`p-4 rounded-xl border-2 cursor-pointer transition ${
                  isDemoMode
                    ? 'border-amber-500 bg-amber-500/10'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    Simulated Demo Stream Mode
                  </span>
                  {isDemoMode && <span className="h-2 w-2 rounded-full bg-amber-500" />}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Runs self-contained high-frequency vehicle telemetry simulations (100 to 10,000 units) directly in browser memory without requiring backend service.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
