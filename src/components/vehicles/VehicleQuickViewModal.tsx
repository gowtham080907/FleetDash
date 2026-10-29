import React from 'react';
import { Vehicle } from '@/types/vehicle';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { useNavigate } from 'react-router-dom';
import {
  Truck,
  Gauge,
  Compass,
  MapPin,
  Clock,
  Fuel,
  Battery,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

interface Props {
  vehicle: Vehicle | null;
  isOpen: boolean;
  onClose: () => void;
}

export const VehicleQuickViewModal: React.FC<Props> = ({
  vehicle,
  isOpen,
  onClose,
}) => {
  const navigate = useNavigate();

  if (!vehicle) return null;

  const handleOpenFullDetails = () => {
    onClose();
    navigate(`/vehicles/${vehicle.id}`);
  };

  const handleLocateOnMap = () => {
    onClose();
    navigate(`/live-map?focus=${vehicle.id}`);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Vehicle Telemetry Profile — ${vehicle.id}`}
      description={vehicle.name}
      maxWidth="lg"
    >
      <div className="space-y-5">
        {/* Header Status Row */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-500/10 text-brand-electric">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Asset Model</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                {vehicle.model || 'Commercial Fleet Unit'}
              </p>
            </div>
          </div>
          <StatusBadge
            status={vehicle.geofenceStatus === 'breached' ? 'breach' : vehicle.status}
            pulse={vehicle.status === 'active'}
          />
        </div>

        {/* Telemetry Matrix Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <span className="text-slate-400 block flex items-center gap-1">
              <Gauge className="w-3.5 h-3.5 text-emerald-500" />
              Current Speed
            </span>
            <span className="text-lg font-black font-mono text-slate-900 dark:text-white mt-1 block">
              {vehicle.speed} <span className="text-xs font-normal text-slate-400">km/h</span>
            </span>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <span className="text-slate-400 block flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-sky-500" />
              Heading Vector
            </span>
            <span className="text-lg font-black font-mono text-slate-900 dark:text-white mt-1 block">
              {vehicle.heading}°
            </span>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <span className="text-slate-400 block flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
              Geofence State
            </span>
            <span className="text-xs font-bold capitalize mt-2 block" style={{ color: vehicle.geofenceStatus === 'breached' ? '#EF4444' : '#10B981' }}>
              {vehicle.geofenceStatus}
            </span>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <span className="text-slate-400 block flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-brand-electric" />
              GPS Coordinates
            </span>
            <span className="font-mono text-[11px] text-slate-800 dark:text-slate-200 mt-1 block">
              {vehicle.latitude.toFixed(4)}, {vehicle.longitude.toFixed(4)}
            </span>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <span className="text-slate-400 block flex items-center gap-1">
              {vehicle.fuelLevel !== undefined ? (
                <Fuel className="w-3.5 h-3.5 text-amber-500" />
              ) : (
                <Battery className="w-3.5 h-3.5 text-emerald-500" />
              )}
              Energy Reserve
            </span>
            <span className="text-sm font-bold font-mono text-slate-800 dark:text-slate-200 mt-1 block">
              {vehicle.fuelLevel ?? vehicle.batteryLevel ?? 85}%
            </span>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <span className="text-slate-400 block flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Last Packet
            </span>
            <span className="font-mono text-[11px] text-slate-800 dark:text-slate-200 mt-1 block">
              {new Date(vehicle.lastUpdated).toLocaleTimeString()}
            </span>
          </div>
        </div>

        {/* Driver & Geofence Details */}
        <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-xs space-y-1.5">
          <div className="flex justify-between">
            <span className="text-slate-500">Operator / Driver:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{vehicle.driverName || 'Unassigned / Autonomous'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Active Perimeter:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{vehicle.currentGeofence || 'Unrestricted Zone'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Odometer:</span>
            <span className="font-mono text-slate-800 dark:text-slate-200">{vehicle.odometer?.toLocaleString()} km</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <Button variant="outline" size="sm" onClick={handleLocateOnMap}>
            <ExternalLink className="w-3.5 h-3.5 mr-1" />
            Track on Map
          </Button>
          <Button variant="electric" size="sm" onClick={handleOpenFullDetails}>
            Full Telemetry Page
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      </div>
    </Modal>
  );
};
