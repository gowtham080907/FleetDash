import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useVehicle } from '@/hooks/useFleetData';
import { StaticFleetMap } from '@/components/map/StaticFleetMap';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  ArrowLeft,
  Truck,
  Gauge,
  MapPin,
  Clock,
  ShieldAlert,
  Radio,
  ExternalLink,
  Fuel,
  Battery,
} from 'lucide-react';

export const VehicleDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: vehicle, isLoading, isError } = useVehicle(id);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-44 w-full rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-80 w-full rounded-xl" />
          <Skeleton className="h-80 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError || !vehicle) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center text-center p-6 bg-slate-900 rounded-xl border border-slate-800">
        <Truck className="w-12 h-12 text-slate-500 mb-3" />
        <h3 className="text-base font-bold text-white">Vehicle Not Found</h3>
        <p className="text-xs text-slate-400 mt-1">
          Vehicle with identifier <span className="font-mono text-brand-electric font-semibold">{id}</span> does not exist in the active fleet registry.
        </p>
        <Button variant="outline" size="sm" onClick={() => navigate('/vehicles')} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Return to Vehicle Registry
        </Button>
      </div>
    );
  }

  // Simulated breadcrumb trail for this vehicle
  const breadcrumbs = [
    { time: '1 min ago', speed: vehicle.speed, lat: vehicle.latitude, lng: vehicle.longitude },
    { time: '3 min ago', speed: Math.max(0, vehicle.speed - 4), lat: vehicle.latitude - 0.003, lng: vehicle.longitude - 0.002 },
    { time: '5 min ago', speed: Math.max(0, vehicle.speed - 8), lat: vehicle.latitude - 0.006, lng: vehicle.longitude - 0.004 },
    { time: '8 min ago', speed: Math.max(0, vehicle.speed - 2), lat: vehicle.latitude - 0.009, lng: vehicle.longitude - 0.007 },
    { time: '12 min ago', speed: 0, lat: vehicle.latitude - 0.012, lng: vehicle.longitude - 0.010 },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/vehicles')}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Registry
          </Button>
          <div className="h-4 w-[1px] bg-slate-300 dark:bg-slate-700" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span className="font-mono text-brand-electric">{vehicle.id}</span>
            <span className="text-slate-400 font-normal text-sm">/ {vehicle.name}</span>
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/live-map?focus=${vehicle.id}`)}
          >
            <ExternalLink className="w-3.5 h-3.5 mr-1" />
            Track on Live Map
          </Button>
        </div>
      </div>

      {/* Hero Overview Card */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-blue-500/10 text-brand-electric flex items-center justify-center">
              <Truck className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                  {vehicle.name}
                </h3>
                <StatusBadge
                  status={vehicle.geofenceStatus === 'breached' ? 'breach' : vehicle.status}
                  pulse={vehicle.status === 'active'}
                />
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Model: {vehicle.model} • Driver: {vehicle.driverName || 'Autonomous Dispatch'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div>
              <span className="text-slate-400 block text-[10px]">CURRENT SPEED</span>
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {vehicle.speed} <span className="text-xs font-normal text-slate-400">km/h</span>
              </span>
            </div>
            <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-800" />
            <div>
              <span className="text-slate-400 block text-[10px]">HEADING</span>
              <span className="text-2xl font-black text-brand-electric">
                {vehicle.heading}°
              </span>
            </div>
          </div>
        </div>

        {/* Telemetry Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-500">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">Velocity State</span>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {vehicle.speed > 0 ? 'In Motion' : 'Stationary'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-sky-500/10 text-sky-500">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">GPS Coordinates</span>
              <span className="text-xs font-mono font-semibold text-slate-800 dark:text-slate-200">
                {vehicle.latitude.toFixed(4)}, {vehicle.longitude.toFixed(4)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-500">
              {vehicle.fuelLevel !== undefined ? (
                <Fuel className="w-5 h-5" />
              ) : (
                <Battery className="w-5 h-5" />
              )}
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">Fuel / Energy</span>
              <span className="text-xs font-mono font-semibold text-slate-800 dark:text-slate-200">
                {vehicle.fuelLevel ?? vehicle.batteryLevel ?? 80}% Reserve
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-500">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">Geofence Status</span>
              <span className="text-xs font-semibold capitalize" style={{ color: vehicle.geofenceStatus === 'breached' ? '#EF4444' : '#10B981' }}>
                {vehicle.geofenceStatus}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Map & Historical Breadcrumbs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Focused Map */}
        <div className="lg:col-span-2 space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Radio className="w-4 h-4 text-brand-electric animate-pulse" />
            Vehicle Coordinate Tracking Viewport
          </h3>
          <StaticFleetMap
            vehicles={[vehicle]}
            selectedVehicleId={vehicle.id}
            height="360px"
            showControls={false}
          />
        </div>

        {/* Right 1 Col: Trajectory Breadcrumbs */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-electric" />
              Recent Trajectory Breadcrumbs
            </CardTitle>
            <CardDescription>Telemetry packets recorded within last 15 minutes</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 space-y-3 text-xs">
            {breadcrumbs.map((b, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 font-mono"
              >
                <div>
                  <span className="text-slate-800 dark:text-slate-200 font-semibold">{b.time}</span>
                  <span className="text-[10px] text-slate-400 block">
                    {b.lat.toFixed(4)}, {b.lng.toFixed(4)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-emerald-500 font-bold">{b.speed} km/h</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
