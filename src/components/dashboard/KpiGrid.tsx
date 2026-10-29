import React from 'react';
import {
  Truck,
  Activity,
  Clock,
  WifiOff,
  ShieldAlert,
  Zap,
  Gauge,
  Wifi,
} from 'lucide-react';
import { KpiCard } from './KpiCard';
import { FleetStats } from '@/types/vehicle';

interface KpiGridProps {
  stats: FleetStats | undefined;
  isLoading?: boolean;
  isError?: boolean;
}

export const KpiGrid: React.FC<KpiGridProps> = ({ stats, isLoading, isError }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Total Vehicles */}
      <KpiCard
        label="Total Vehicles"
        value={stats ? stats.totalVehicles.toLocaleString() : '—'}
        subtitle="Registered Fleet Units"
        icon={<Truck className="w-5 h-5" />}
        accentColor="blue"
        trend={{ value: '+4 this month', isPositive: true }}
        isLoading={isLoading}
        error={isError}
      />

      {/* 2. Active Vehicles */}
      <KpiCard
        label="Active Vehicles"
        value={stats ? stats.activeVehicles.toLocaleString() : '—'}
        subtitle={stats ? `${Math.round((stats.activeVehicles / stats.totalVehicles) * 100)}% fleet utilization` : 'Operational Units'}
        icon={<Activity className="w-5 h-5" />}
        accentColor="emerald"
        trend={{ value: 'In Transit', isPositive: true }}
        isLoading={isLoading}
        error={isError}
      />

      {/* 3. Idle Vehicles */}
      <KpiCard
        label="Idle Vehicles"
        value={stats ? stats.idleVehicles.toLocaleString() : '—'}
        subtitle="Engine On / Stationary"
        icon={<Clock className="w-5 h-5" />}
        accentColor="amber"
        trend={{ value: 'Staging / Loading', isNeutral: true }}
        isLoading={isLoading}
        error={isError}
      />

      {/* 4. Offline Vehicles */}
      <KpiCard
        label="Offline Vehicles"
        value={stats ? stats.offlineVehicles.toLocaleString() : '—'}
        subtitle="Parked or Disconnected"
        icon={<WifiOff className="w-5 h-5" />}
        accentColor="slate"
        trend={{ value: 'Depot Garaged', isNeutral: true }}
        isLoading={isLoading}
        error={isError}
      />

      {/* 5. Active Geofence Alerts */}
      <KpiCard
        label="Geofence Alerts"
        value={stats ? stats.activeAlerts.toLocaleString() : '—'}
        subtitle="Boundary & Breach Events"
        icon={<ShieldAlert className="w-5 h-5" />}
        accentColor="rose"
        trend={{ value: stats && stats.activeAlerts > 0 ? 'Requires Action' : 'Nominal', isPositive: !stats || stats.activeAlerts === 0 }}
        isLoading={isLoading}
        error={isError}
      />

      {/* 6. Telemetry Ingestion Rate */}
      <KpiCard
        label="Telemetry Ingestion"
        value={stats ? stats.eventsPerSecond.toLocaleString() : '—'}
        unit="evt/s"
        subtitle="Real-Time Event Stream"
        icon={<Zap className="w-5 h-5" />}
        accentColor="blue"
        trend={{ value: 'High Throughput', isPositive: true }}
        isLoading={isLoading}
        error={isError}
      />

      {/* 7. Average Fleet Speed */}
      <KpiCard
        label="Average Speed"
        value={stats ? stats.averageSpeed : '—'}
        unit="km/h"
        subtitle="Active Fleet Velocity"
        icon={<Gauge className="w-5 h-5" />}
        accentColor="emerald"
        trend={{ value: 'Normal corridor flow', isPositive: true }}
        isLoading={isLoading}
        error={isError}
      />

      {/* 8. Connection Status */}
      <KpiCard
        label="Connection Status"
        value={stats?.connectionStatus === 'connected' ? 'LIVE' : 'OFFLINE'}
        subtitle={stats?.connectionStatus === 'connected' ? 'Socket.IO duplex pipe' : 'Connecting to gateway'}
        icon={<Wifi className="w-5 h-5" />}
        accentColor={stats?.connectionStatus === 'connected' ? 'emerald' : 'rose'}
        trend={{ value: 'WebSocket Transport', isPositive: stats?.connectionStatus === 'connected' }}
        isLoading={isLoading}
        error={isError}
      />
    </div>
  );
};
