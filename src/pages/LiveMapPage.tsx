import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CanvasFleetMap } from '@/components/map/CanvasFleetMap';
import { useSimulatorStore } from '@/services/simulator/telemetrySimulator';
import { positionStore } from '@/stores/vehiclePositionStore';
import { Button } from '@/components/ui/Button';
import { MapPin, Search, Play, Pause, ShieldAlert } from 'lucide-react';

export const LiveMapPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const focusedVehicleId = searchParams.get('focus');

  const { isRunning, isPaused, start, pause, resume, triggerManualBreach, vehicleCount } =
    useSimulatorStore();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      const v = positionStore.getPosition(searchQuery.trim().toUpperCase());
      if (v) {
        // Can be focused
      }
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-brand-electric" />
            Real-Time Canvas Geospace Map
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Synchronized HTML5 Canvas rendering engine with viewport culling, tracking {vehicleCount.toLocaleString()} units.
          </p>
        </div>

        {/* Live Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Find ID (e.g. VH-1012)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 pr-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-electric w-44 sm:w-52"
            />
          </form>

          {/* Stream Play/Pause Toggle */}
          {!isRunning ? (
            <Button variant="electric" size="sm" onClick={start} className="h-8 px-2.5 text-xs gap-1.5">
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Start Stream</span>
            </Button>
          ) : isPaused ? (
            <Button variant="outline" size="sm" onClick={resume} className="h-8 px-2.5 text-xs gap-1.5">
              <Play className="w-3.5 h-3.5" />
              <span>Resume</span>
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={pause} className="h-8 px-2.5 text-xs gap-1.5">
              <Pause className="w-3.5 h-3.5" />
              <span>Pause</span>
            </Button>
          )}

          {/* Manual Breach Test Trigger */}
          <Button
            variant="outline"
            size="sm"
            onClick={triggerManualBreach}
            className="h-8 px-2.5 text-xs border-rose-500/40 text-rose-500 hover:bg-rose-500/10 gap-1"
            title="Simulate Geofence Breach"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Test Breach</span>
          </Button>
        </div>
      </div>

      {/* Synchronized 60 FPS Canvas Map Viewport */}
      <CanvasFleetMap
        focusedVehicleId={focusedVehicleId}
        height="calc(100vh - 190px)"
      />
    </div>
  );
};
