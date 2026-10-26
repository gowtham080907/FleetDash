import React from 'react';
import { useAlertStore } from '@/stores/alertStore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  MapPin,
  Eye,
  EyeOff,
  Truck,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';

export const GeofencesPage: React.FC = () => {
  const navigate = useNavigate();
  const { geofences, toggleGeofenceVisibility } = useAlertStore();

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-brand-electric" />
            Geofencing & Boundary Management
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Authoritative perimeter oversight, boundary speed limits, and breach monitoring.
          </p>
        </div>

        <Button variant="electric" size="sm" onClick={() => navigate('/live-map')} className="gap-1.5">
          <MapPin className="w-4 h-4" />
          <span>View on Live Map</span>
        </Button>
      </div>

      {/* Geofence Zones Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {geofences.map((zone) => {
          return (
            <Card
              key={zone.id}
              className="border-t-4 hover:shadow-md transition-shadow relative overflow-hidden"
              style={{ borderTopColor: zone.color }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
                      {zone.type === 'circle' ? 'Radial Hub Boundary' : 'Polygonal Transit Zone'}
                    </span>
                    <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: zone.color }} />
                      {zone.name}
                    </CardTitle>
                  </div>

                  <button
                    onClick={() => toggleGeofenceVisibility(zone.id)}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition"
                    title={zone.visible ? 'Hide from map' : 'Show on map'}
                  >
                    {zone.visible ? (
                      <Eye className="w-4 h-4 text-brand-electric" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                </div>
                <CardDescription className="text-xs text-slate-500 mt-1">
                  {zone.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4 pt-0">
                <div className="grid grid-cols-3 gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-mono">SPEED CEILING</span>
                    <span className="font-black font-mono text-slate-800 dark:text-slate-200">
                      {zone.speedLimitKmH} km/h
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block font-mono">INSIDE UNITS</span>
                    <span className="font-black font-mono text-emerald-500 flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5" />
                      {zone.activeVehiclesCount}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block font-mono">BREACHES</span>
                    <span
                      className={`font-black font-mono flex items-center gap-1 ${
                        zone.breachCount > 0 ? 'text-rose-500' : 'text-slate-400'
                      }`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {zone.breachCount}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] font-mono text-slate-400">
                    {zone.type === 'circle'
                      ? `Radius: ${(zone.radiusMeters! / 1000).toFixed(1)} km`
                      : `${zone.coordinates?.length || 4} Vertex Coordinates`}
                  </span>

                  <button
                    onClick={() => navigate('/live-map')}
                    className="text-xs font-semibold text-brand-electric hover:underline flex items-center gap-1"
                  >
                    <span>Inspect Area</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
