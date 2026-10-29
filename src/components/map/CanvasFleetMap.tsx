import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Circle, Polygon, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { CanvasRenderEngine, CanvasEngineMetrics, HitTestResult } from '@/engine/canvas/CanvasRenderEngine';
import { useAlertStore } from '@/stores/alertStore';
import { useSimulatorStore } from '@/services/simulator/telemetrySimulator';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { VehicleTelemetry } from '@/types/telemetry';
import { positionStore } from '@/stores/vehiclePositionStore';
import { useNavigate } from 'react-router-dom';
import {
  Maximize2,
  Minimize2,
  Crosshair,
  Layers,
  Compass,
  Gauge,
  ShieldAlert,
  Cpu,
  ArrowRight,
  Eye,
  EyeOff,
  Crosshair as FocusIcon,
} from 'lucide-react';
import { cn } from '@/utils/cn';

interface CanvasFleetMapProps {
  focusedVehicleId?: string | null;
  onSelectVehicle?: (vehicle: VehicleTelemetry) => void;
  height?: string;
  className?: string;
}

// Controller component to bridge Leaflet map instance with the custom Canvas overlay
const CanvasOverlayController: React.FC<{
  onEngineReady: (engine: CanvasRenderEngine) => void;
  focusedVehicle?: VehicleTelemetry | null;
  isFollowing: boolean;
  onMetricsUpdate: (metrics: CanvasEngineMetrics) => void;
  onVehicleClick: (vehicle: VehicleTelemetry) => void;
  onVehicleHover: (result: HitTestResult | null) => void;
}> = ({
  onEngineReady,
  focusedVehicle,
  isFollowing,
  onMetricsUpdate,
  onVehicleClick,
  onVehicleHover,
}) => {
  const map = useMap();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<CanvasRenderEngine | null>(null);

  useEffect(() => {
    // 1. Create or obtain canvas element on Leaflet's overlay pane
    const overlayPane = map.getPanes().overlayPane;
    let canvas = canvasRef.current;

    if (!canvas) {
      canvas = L.DomUtil.create('canvas', 'leaflet-canvas-overlay') as HTMLCanvasElement;
      canvas.style.position = 'absolute';
      canvas.style.left = '0';
      canvas.style.top = '0';
      canvas.style.pointerEvents = 'none'; // Map handles pan/zoom; parent listens to clicks
      canvas.style.zIndex = '400';
      overlayPane.appendChild(canvas);
      canvasRef.current = canvas;
    }

    // 2. Initialize Canvas Render Engine
    const engine = new CanvasRenderEngine(map, canvas, {
      onMetricsUpdate,
      onVehicleClick,
      onVehicleHover,
    });
    engineRef.current = engine;
    onEngineReady(engine);

    return () => {
      engine.destroy();
      if (canvas && canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
      canvasRef.current = null;
      engineRef.current = null;
    };
  }, [map, onEngineReady, onMetricsUpdate, onVehicleClick, onVehicleHover]);

  // Handle follow mode
  useEffect(() => {
    if (isFollowing && focusedVehicle) {
      map.panTo([focusedVehicle.latitude, focusedVehicle.longitude], {
        animate: true,
        duration: 0.3,
      });
    }
  }, [focusedVehicle, isFollowing, map]);

  return null;
};

export const CanvasFleetMap: React.FC<CanvasFleetMapProps> = ({
  focusedVehicleId,
  onSelectVehicle,
  height = '600px',
  className,
}) => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const engineRef = useRef<CanvasRenderEngine | null>(null);

  const { isRunning, start } = useSimulatorStore();
  const { geofences } = useAlertStore();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showGeofences, setShowGeofences] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);

  const [metrics, setMetrics] = useState<CanvasEngineMetrics>({
    fps: 60,
    avgFps: 60,
    frameTimeMs: 1.2,
    visibleCount: 0,
    totalCount: 0,
    cullRatio: 0,
  });

  const [selectedVehicle, setSelectedVehicle] = useState<VehicleTelemetry | null>(null);
  const [hoveredResult, setHoveredResult] = useState<HitTestResult | null>(null);

  const defaultCenter: [number, number] = [41.8781, -87.6298];
  const defaultZoom = 11;

  // Auto-start simulator in demo mode if not running so vehicles are immediately moving
  useEffect(() => {
    if (!isRunning) {
      start();
    }
  }, [isRunning, start]);

  useEffect(() => {
    if (focusedVehicleId) {
      const v = positionStore.getPosition(focusedVehicleId);
      if (v) {
        setSelectedVehicle(v);
        setIsFollowing(true);
        if (engineRef.current) engineRef.current.setSelectedVehicleId(v.vehicleId);
      }
    }
  }, [focusedVehicleId]);

  const handleVehicleClick = (v: VehicleTelemetry) => {
    setSelectedVehicle(v);
    if (engineRef.current) engineRef.current.setSelectedVehicleId(v.vehicleId);
    if (onSelectVehicle) onSelectVehicle(v);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      setIsFollowing(false);
      setSelectedVehicle(null);
      mapInstanceRef.current.setView(defaultCenter, defaultZoom, { animate: true, duration: 0.8 });
    }
  };

  const handleEngineReady = (engine: CanvasRenderEngine) => {
    engineRef.current = engine;
  };

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!engineRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    engineRef.current.handleCanvasClick(screenX, screenY);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!engineRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    engineRef.current.handleCanvasMouseMove(screenX, screenY);
  };

  return (
    <div
      ref={containerRef}
      onClick={handleMapClick}
      onMouseMove={handleMouseMove}
      className={cn(
        'relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 shadow-md transition-all',
        isFullscreen ? 'fixed inset-0 z-50 rounded-none h-screen w-screen' : '',
        className
      )}
      style={{ height: isFullscreen ? '100vh' : height }}
    >
      {/* Top Left: Canvas Engine HUD & Mode Indicator */}
      <div className="absolute top-3 left-3 z-[1000] flex flex-col sm:flex-row items-start sm:items-center gap-2 pointer-events-auto">
        {/* Engine Performance Pill */}
        <div className="flex items-center gap-2.5 rounded-lg bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-3 py-1.5 text-xs text-white shadow-xl">
          <div className="flex items-center gap-1.5 font-mono">
            <Cpu className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-bold text-emerald-400">{metrics.fps} FPS</span>
            <span className="text-[10px] text-slate-400">({metrics.frameTimeMs}ms)</span>
          </div>

          <div className="h-3 w-[1px] bg-slate-700" />

          <div className="flex items-center gap-1 text-[11px] font-mono text-slate-300">
            <Layers className="w-3.5 h-3.5 text-brand-electric" />
            <span>Visible:</span>
            <span className="font-bold text-white">{metrics.visibleCount}</span>
            <span className="text-[10px] text-slate-400">/ {metrics.totalCount}</span>
          </div>
        </div>

        {/* Viewport Culling Status */}
        <div className="hidden md:flex items-center gap-1 rounded-lg bg-slate-900/85 backdrop-blur-md border border-slate-700/80 px-2.5 py-1.5 text-[11px] font-mono text-slate-300 shadow-lg">
          <span>Culling:</span>
          <span className="font-bold text-amber-400">{Math.round(metrics.cullRatio * 100)}% pruned</span>
        </div>
      </div>

      {/* Top Right Controls Toolbar */}
      <div className="absolute top-3 right-3 z-[1000] flex items-center gap-2 pointer-events-auto">
        {/* Geofence Visibility Toggle */}
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowGeofences(!showGeofences)}
          className="h-8 px-2.5 text-xs bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-700 backdrop-blur-md shadow-lg"
          title={showGeofences ? 'Hide Geofence Perimeters' : 'Show Geofence Perimeters'}
        >
          {showGeofences ? <Eye className="w-3.5 h-3.5 mr-1 text-brand-electric" /> : <EyeOff className="w-3.5 h-3.5 mr-1 text-slate-400" />}
          <span className="hidden sm:inline">Perimeters</span>
        </Button>

        {/* Follow Vehicle Toggle */}
        {selectedVehicle && (
          <Button
            variant={isFollowing ? 'electric' : 'secondary'}
            size="sm"
            onClick={() => setIsFollowing(!isFollowing)}
            className="h-8 px-2.5 text-xs border border-slate-700 backdrop-blur-md shadow-lg"
            title="Follow selected unit coordinates"
          >
            <FocusIcon className="w-3.5 h-3.5 mr-1" />
            <span>Follow</span>
          </Button>
        )}

        {/* Recenter Control */}
        <Button
          variant="secondary"
          size="sm"
          onClick={handleRecenter}
          className="h-8 px-2.5 text-xs bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-700 backdrop-blur-md shadow-lg"
          title="Recenter Map on Fleet Hub"
        >
          <Crosshair className="w-3.5 h-3.5 mr-1 text-emerald-400" />
          <span className="hidden sm:inline">Recenter</span>
        </Button>

        {/* Fullscreen Toggle */}
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

      {/* Hover Tooltip Overlay */}
      {hoveredResult && !selectedVehicle && (
        <div
          className="absolute z-[1200] pointer-events-none rounded-lg bg-slate-900/95 border border-slate-700 px-3 py-2 text-white shadow-2xl backdrop-blur-sm -translate-x-1/2 -translate-y-full mb-3"
          style={{
            left: `${hoveredResult.screenX}px`,
            top: `${hoveredResult.screenY}px`,
          }}
        >
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-xs text-brand-electric">
              {hoveredResult.vehicle.vehicleId}
            </span>
            <span className="text-[10px] font-bold uppercase" style={{ color: hoveredResult.vehicle.status === 'active' ? '#10B981' : '#F59E0B' }}>
              {hoveredResult.vehicle.status}
            </span>
          </div>
          <div className="mt-1 font-mono text-[11px] text-slate-300">
            <span>{hoveredResult.vehicle.speed} km/h</span> • <span>{hoveredResult.vehicle.heading}°</span>
          </div>
          {hoveredResult.vehicle.geofenceStatus === 'breached' && (
            <p className="text-[10px] text-rose-400 font-bold mt-0.5">PERIMETER BREACH</p>
          )}
        </div>
      )}

      {/* Selected Vehicle HUD Inspector */}
      {selectedVehicle && (
        <div className="absolute bottom-12 left-3 z-[1100] w-80 rounded-xl bg-slate-900/95 backdrop-blur-md border border-slate-700 p-4 text-white shadow-2xl animate-in slide-in-from-bottom-2 pointer-events-auto">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-mono text-[10px] text-brand-electric uppercase tracking-wider font-bold">
                Telemetry Target
              </span>
              <h4 className="text-base font-bold text-white flex items-center gap-1.5">
                {selectedVehicle.vehicleId}
              </h4>
            </div>
            <StatusBadge
              status={selectedVehicle.geofenceStatus === 'breached' ? 'breach' : selectedVehicle.status}
              size="sm"
            />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-xs border-t border-slate-800 pt-2.5">
            <div className="flex items-center gap-1.5 text-slate-300">
              <Gauge className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-mono font-bold">{selectedVehicle.speed} km/h</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <Compass className="w-3.5 h-3.5 text-sky-400" />
              <span className="font-mono font-bold">{selectedVehicle.heading}° Heading</span>
            </div>
            <div className="col-span-2 font-mono text-[11px] text-slate-400">
              Coords: {selectedVehicle.latitude.toFixed(5)}, {selectedVehicle.longitude.toFixed(5)}
            </div>
            {selectedVehicle.geofenceStatus === 'breached' && (
              <div className="col-span-2 flex items-center gap-1.5 text-rose-400 font-semibold text-[11px]">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>ACTIVE GEOFENCE BREACH DETECTED</span>
              </div>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-800">
            <button
              onClick={() => {
                setSelectedVehicle(null);
                setIsFollowing(false);
              }}
              className="text-xs text-slate-400 hover:text-white transition"
            >
              Dismiss
            </button>
            <Button
              variant="electric"
              size="sm"
              onClick={() => navigate(`/vehicles/${selectedVehicle.vehicleId}`)}
              className="h-7 text-xs px-2.5 gap-1"
            >
              <span>Full Details</span>
              <ArrowRight className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Map Legend Overlay */}
      <div className="absolute bottom-3 right-3 z-[1000] flex items-center gap-3 rounded-lg bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-3 py-1.5 text-[11px] text-white shadow-lg pointer-events-auto">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          <span className="text-slate-300">Active</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
          <span className="text-slate-300">Idle</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
          <span className="text-slate-300">Offline</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-ping" />
          <span className="text-rose-400 font-bold">Breach</span>
        </div>
      </div>

      {/* Leaflet Base Map Layer */}
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        style={{ width: '100%', height: '100%' }}
        scrollWheelZoom={true}
        ref={(map) => {
          if (map) mapInstanceRef.current = map;
        }}
      >
        <CanvasOverlayController
          onEngineReady={handleEngineReady}
          focusedVehicle={selectedVehicle}
          isFollowing={isFollowing}
          onMetricsUpdate={setMetrics}
          onVehicleClick={handleVehicleClick}
          onVehicleHover={setHoveredResult}
        />

        {/* High Contrast CartoDB Dark Matter base map */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        {/* Geofence Perimeter Overlays */}
        {showGeofences &&
          geofences
            .filter((g) => g.visible)
            .map((zone) => {
              if (zone.type === 'circle' && zone.center && zone.radiusMeters) {
                return (
                  <Circle
                    key={zone.id}
                    center={zone.center}
                    radius={zone.radiusMeters}
                    pathOptions={{
                      color: zone.color,
                      fillColor: zone.color,
                      fillOpacity: zone.fillOpacity,
                      weight: 2,
                      dashArray: '4, 6',
                    }}
                  >
                    <Popup>
                      <div className="p-1 font-sans text-xs">
                        <p className="font-bold text-slate-900">{zone.name}</p>
                        <p className="text-slate-500 text-[11px]">{zone.description}</p>
                        <p className="font-mono text-brand-electric font-semibold mt-1">
                          Speed Limit: {zone.speedLimitKmH} km/h
                        </p>
                      </div>
                    </Popup>
                  </Circle>
                );
              }

              if (zone.type === 'polygon' && zone.coordinates) {
                return (
                  <Polygon
                    key={zone.id}
                    positions={zone.coordinates}
                    pathOptions={{
                      color: zone.color,
                      fillColor: zone.color,
                      fillOpacity: zone.fillOpacity,
                      weight: 2,
                      dashArray: '4, 6',
                    }}
                  >
                    <Popup>
                      <div className="p-1 font-sans text-xs">
                        <p className="font-bold text-slate-900">{zone.name}</p>
                        <p className="text-slate-500 text-[11px]">{zone.description}</p>
                        <p className="font-mono text-brand-electric font-semibold mt-1">
                          Speed Limit: {zone.speedLimitKmH} km/h
                        </p>
                      </div>
                    </Popup>
                  </Polygon>
                );
              }

              return null;
            })}
      </MapContainer>
    </div>
  );
};
