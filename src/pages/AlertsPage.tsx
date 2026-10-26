import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAlertStore } from '@/stores/alertStore';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  Bell,
  ShieldAlert,
  CheckCircle2,
  MapPin,
  Clock,
  Gauge,
  Trash2,
  ExternalLink,
} from 'lucide-react';

export const AlertsPage: React.FC = () => {
  const navigate = useNavigate();
  const { alerts, unreadAlertsCount, acknowledgeAlert, clearAllAlerts } = useAlertStore();
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'critical' | 'unacknowledged'>('all');

  const filteredAlerts = alerts.filter((a) => {
    if (filterSeverity === 'critical') return a.severity === 'critical';
    if (filterSeverity === 'unacknowledged') return !a.acknowledged;
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Bell className="w-5 h-5 text-brand-electric" />
            Security & Geofence Alerts Feed
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time incident dispatch feed, perimeter violations, and operational warnings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {alerts.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllAlerts}
              className="gap-1.5 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Feed</span>
            </Button>
          )}

          <Button variant="electric" size="sm" onClick={() => navigate('/live-map')} className="gap-1.5 text-xs">
            <MapPin className="w-3.5 h-3.5" />
            <span>Open Map</span>
          </Button>
        </div>
      </div>

      {/* Filter Tabs & Unread Counter */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterSeverity('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filterSeverity === 'all'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            All Incidents ({alerts.length})
          </button>

          <button
            onClick={() => setFilterSeverity('unacknowledged')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              filterSeverity === 'unacknowledged'
                ? 'bg-rose-600 text-white'
                : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Unacknowledged ({unreadAlertsCount})</span>
          </button>
        </div>
      </div>

      {/* Incident Alerts List */}
      {filteredAlerts.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="All Operational Clear"
          description="There are currently no active geofence breaches or unresolved threshold warnings."
        />
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map((alert) => {
            return (
              <Card
                key={alert.id}
                className={`transition-all duration-200 border-l-4 ${
                  alert.acknowledged
                    ? 'border-l-slate-400 opacity-75'
                    : 'border-l-rose-500 shadow-sm'
                }`}
              >
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  {/* Left: Icon & Alert Details */}
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`p-2 rounded-lg shrink-0 ${
                        alert.acknowledged
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                          : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 animate-pulse'
                      }`}
                    >
                      <ShieldAlert className="w-5 h-5" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-brand-electric">
                          {alert.vehicleId}
                        </span>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          Perimeter Breach: {alert.geofenceName}
                        </span>
                        {!alert.acknowledged && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-500/20 text-rose-500">
                            ACTION REQUIRED
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-xs font-mono text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <Gauge className="w-3.5 h-3.5 text-emerald-500" />
                          {alert.speed} km/h
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-sky-500" />
                          {alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {new Date(alert.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Action Buttons */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {!alert.acknowledged && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => acknowledgeAlert(alert.id)}
                        className="h-8 text-xs gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Acknowledge</span>
                      </Button>
                    )}

                    <Button
                      variant="electric"
                      size="sm"
                      onClick={() => navigate(`/live-map?focus=${alert.vehicleId}`)}
                      className="h-8 text-xs gap-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Track Unit</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
