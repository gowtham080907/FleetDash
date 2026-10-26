import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useFleetStats, useDashboardAnalytics, useVehicles } from '@/hooks/useFleetData';
import { KpiGrid } from '@/components/dashboard/KpiGrid';
import { StatusDistributionChart } from '@/components/charts/StatusDistributionChart';
import { FleetActivityChart } from '@/components/charts/FleetActivityChart';
import { ThroughputChart } from '@/components/charts/ThroughputChart';
import { SpeedDistributionChart } from '@/components/charts/SpeedDistributionChart';
import { AlertSeverityChart } from '@/components/charts/AlertSeverityChart';
import { StaticFleetMap } from '@/components/map/StaticFleetMap';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import {
  MapPin,
  Truck,
  Activity,
  ArrowRight,
  ShieldAlert,
  RotateCw,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: stats, isLoading: statsLoading, isError: statsError, refetch: refetchStats } = useFleetStats();
  const { data: analytics, isLoading: analyticsLoading } = useDashboardAnalytics();
  const { data: vehiclesData } = useVehicles({ pageSize: 25 });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Activity className="w-5 h-5 text-brand-electric" />
            Executive Telemetry Command Center
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time fleet operations, ingestion throughput, and geofence security oversight.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchStats()}
            className="gap-1.5"
            title="Refresh metrics"
          >
            <RotateCw className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Sync Data</span>
          </Button>

          <Button variant="outline" size="sm" onClick={() => navigate('/vehicles')}>
            <Truck className="w-3.5 h-3.5" />
            <span>Vehicles</span>
          </Button>

          <Button variant="electric" size="sm" onClick={() => navigate('/live-map')}>
            <MapPin className="w-3.5 h-3.5" />
            <span>Live Map</span>
          </Button>
        </div>
      </div>

      {/* 8 KPI Cards Grid */}
      <KpiGrid stats={stats} isLoading={statsLoading} isError={statsError} />

      {/* Map & Real-Time Alert Ticker Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Geospatial Fleet Preview Map */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-brand-electric" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Geospatial Fleet Deployment Preview
              </h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/live-map')}
              className="text-xs text-brand-electric hover:text-brand-electric-hover p-0 h-auto"
            >
              Open Full Live Map &rarr;
            </Button>
          </div>

          <StaticFleetMap
            vehicles={vehiclesData?.items || []}
            height="340px"
            showControls={true}
          />
        </div>

        {/* Right 1 Col: Geofence Breach Alert Breakdown & Quick Ticker */}
        <div className="space-y-4">
          {analytics && <AlertSeverityChart data={analytics.alertBreakdown} isLoading={analyticsLoading} />}

          {/* Quick Notice Card */}
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4" />
                Active Perimeter Oversight
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                4 fleet units have triggered perimeter breaches. Coordinates and telemetry are being streamed via high-frequency buffers.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/alerts')}
                className="mt-3 w-full text-xs"
              >
                Inspect Alerts Feed
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Analytical Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Status Distribution Donut Chart */}
        <div className="lg:col-span-1">
          {analytics && (
            <StatusDistributionChart
              data={analytics.statusDistribution}
              isLoading={analyticsLoading}
            />
          )}
        </div>

        {/* Fleet Activity 24h Area Chart */}
        <div className="lg:col-span-2">
          {analytics && (
            <FleetActivityChart
              data={analytics.activityTrends}
              isLoading={analyticsLoading}
            />
          )}
        </div>

        {/* Speed Distribution Histogram */}
        <div className="lg:col-span-1">
          {analytics && (
            <SpeedDistributionChart
              data={analytics.speedDistribution}
              isLoading={analyticsLoading}
            />
          )}
        </div>
      </div>

      {/* Ingestion Throughput Bar Chart */}
      <div>
        {analytics && (
          <ThroughputChart
            data={analytics.throughputHistory}
            isLoading={analyticsLoading}
          />
        )}
      </div>
    </div>
  );
};
