import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Vehicle } from '@/types/vehicle';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  Maximize2,
  Minimize2,
  Compass,
  Gauge,
  User,
  ShieldAlert,
  Crosshair,
  Layers,
} from 'lucide-react';
import { cn } from '@/utils/cn';

interface StaticFleetMapProps {
  vehicles: Vehicle[];
  selectedVehicleId?: string | null;
  onSelectVehicle?: (vehicle: Vehicle) => void;
  height?: string;
  className?: string;
  showControls?: boolean;
}

// Controller component to programmatically pan/zoom Leaflet
const MapViewController: React.FC<{
  center: [number, number];
  zoom: number;
  triggerRecenter: number;
}> = ({ center, zoom, triggerRecenter }) => {
  const map = useMap();

  useEffect(() => {
    map.setView(center, zoom, { animate: true, duration: 0.8 });
  }, [triggerRecenter, map, center, zoom]);

  return null;
};

// Custom SVG vehicle marker with heading rotation and status halo
function createVehicleIcon(vehicle: Vehicle, isSelected: boolean): L.DivIcon {
  const statusColor =
    vehicle.geofenceStatus === 'breached'
      ? '#EF4444'
      : vehicle.status === 'active'
      ? '#10B981'
      : vehicle.status === 'idle'
      ? '#F59E0B'
      : '#64748B';

  const isBreached = vehicle.geofenceStatus === 'breached';

  const html = `
    <div style="
      position: relative;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    ">
      ${
        isBreached
          ? `<div style="
              position: absolute;
              inset: 0px;
              border-radius: 9999px;
              background-color: rgba(239, 68, 68, 0.4);
              animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
            "></div>`
          : ''
      }
      <div style="
        width: 26px;
        height: 26px;
        border-radius: 9999px;
        background-color: ${isSelected ? '#0066FF' : '#0F172A'};
        border: 2px solid ${statusColor};
        box-shadow: 0 4px 6px -1px rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        transform: rotate(${vehicle.heading}deg);
        transition: transform 0.3s ease;
      ">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${
          isSelected ? '#FFFFFF' : statusColor
        }" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="12 2 19 21 12 17 5 21 12 2"></polygon>
        </svg>
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-fleet-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });
}

export const StaticFleetMap: React.FC<StaticFleetMapProps> = ({
  vehicles,
  selectedVehicleId,
  onSelectVehicle,
  height = '500px',
  className,
  showControls = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [recenterCount, setRecenterCount] = useState(0);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  const defaultCenter: [number, number] = [41.8781, -87.6298]; // Chicago fleet hub
  const defaultZoom = 11;

  useEffect(() => {
    if (selectedVehicleId) {
      const found = vehicles.find((v) => v.id === selectedVehicleId);
      if (found) setSelectedVehicle(found);
    }
  }, [selectedVehicleId, vehicles]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handleRecenter = () => {
    setSelectedVehicle(null);
    setRecenterCount((prev) => prev + 1);
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900 shadow-sm transition-all',
        isFullscreen ? 'fixed inset-0 z-50 rounded-none h-screen w-screen' : '',
        className
      )}
      style={{ height: isFullscreen ? '100vh' : height }}
    >
      {/* Map Header Overlay */}
      {showControls && (
        <div className="absolute top-3 left-3 z-[1000] flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-3 py-1.5 text-xs text-white shadow-lg">
            <Layers className="w-3.5 h-3.5 text-brand-electric" />
            <span className="font-semibold tracking-wide">Leaflet GIS Base Layer</span>
            <span className="text-[10px] text-slate-400 font-mono">({vehicles.length} Units)</span>
          </div>
        </div>
      )}

      {/* Map Action Controls (Recenter, Fullscreen) */}
      {showControls && (
        <div className="absolute top-3 right-3 z-[1000] flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRecenter}
            className="h-8 px-2.5 text-xs bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-700 backdrop-blur-md shadow-lg"
            title="Recenter Map on Fleet Hub"
          >
            <Crosshair className="w-3.5 h-3.5 mr-1 text-emerald-400" />
            Recenter
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={toggleFullscreen}
            className="h-8 w-8 p-0 bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-700 backdrop-blur-md shadow-lg"
            title={isFullscreen ? 'Exit Fullscreen' : 'View Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
        </div>
      )}

      {/* Selected Vehicle Quick Inspector HUD */}
      {selectedVehicle && (
        <div className="absolute bottom-12 left-3 z-[1000] w-72 rounded-xl bg-slate-900/95 backdrop-blur-md border border-slate-700 p-4 text-white shadow-2xl animate-in slide-in-from-bottom-2">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-mono text-[10px] text-brand-electric uppercase tracking-wider font-bold">
                Selected Unit
              </span>
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                {selectedVehicle.id}
                <span className="text-xs text-slate-400 font-normal">({selectedVehicle.name})</span>
              </h4>
            </div>
            <StatusBadge
              status={
                selectedVehicle.geofenceStatus === 'breached'
                  ? 'breach'
                  : selectedVehicle.status
              }
              size="sm"
            />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-xs border-t border-slate-800 pt-2.5">
            <div className="flex items-center gap-1.5 text-slate-300">
              <Gauge className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-mono">{selectedVehicle.speed} km/h</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <Compass className="w-3.5 h-3.5 text-sky-400" />
              <span className="font-mono">{selectedVehicle.heading}° Heading</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300 col-span-2 truncate">
              <User className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="truncate">{selectedVehicle.driverName || 'Automated / Unassigned'}</span>
            </div>
            {selectedVehicle.currentGeofence && (
              <div className="flex items-center gap-1.5 text-slate-300 col-span-2 truncate">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span className="truncate text-[11px]">{selectedVehicle.currentGeofence}</span>
              </div>
            )}
          </div>

          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setSelectedVehicle(null)}
              className="text-[11px] text-slate-400 hover:text-white transition"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Map Legend Overlay */}
      <div className="absolute bottom-3 right-3 z-[1000] flex items-center gap-3 rounded-lg bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-3 py-1.5 text-[11px] text-white shadow-lg">
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-slate-300">Active</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          <span className="text-slate-300">Idle</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-slate-400" />
          <span className="text-slate-300">Offline</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
          <span className="text-rose-400 font-bold">Breach</span>
        </div>
      </div>

      {/* Actual Leaflet Map Canvas */}
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        style={{ width: '100%', height: '100%' }}
        scrollWheelZoom={true}
      >
        <MapViewController
          center={defaultCenter}
          zoom={defaultZoom}
          triggerRecenter={recenterCount}
        />

        {/* High contrast CartoDB Dark Matter tiles or OpenStreetMap */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        {/* Vehicle Markers */}
        {vehicles.map((vehicle) => {
          const isSelected = selectedVehicle?.id === vehicle.id;
          const icon = createVehicleIcon(vehicle, isSelected);

          return (
            <Marker
              key={vehicle.id}
              position={[vehicle.latitude, vehicle.longitude]}
              icon={icon}
              eventHandlers={{
                click: () => {
                  setSelectedVehicle(vehicle);
                  if (onSelectVehicle) onSelectVehicle(vehicle);
                },
              }}
            >
              <Popup className="fleet-leaflet-popup">
                <div className="p-1 text-slate-900">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-1 mb-1">
                    <span className="font-mono font-bold text-brand-electric">{vehicle.id}</span>
                    <span className="text-[10px] font-bold uppercase">{vehicle.status}</span>
                  </div>
                  <p className="text-xs font-semibold">{vehicle.name}</p>
                  <p className="text-[11px] text-slate-600">Speed: {vehicle.speed} km/h</p>
                  <p className="text-[11px] text-slate-600">Driver: {vehicle.driverName || 'N/A'}</p>
                  {vehicle.geofenceStatus === 'breached' && (
                    <p className="text-[11px] text-rose-600 font-bold mt-1">GEOFENCE BREACH DETECTED</p>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};
