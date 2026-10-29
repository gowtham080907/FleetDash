import React, { useState, useEffect } from 'react';
import { useSimulatorStore, VehicleScaleCount } from '@/services/simulator/telemetrySimulator';
import { useVehiclePositionStore, positionStore } from '@/stores/vehiclePositionStore';
import { socketService } from '@/services/socket/socketService';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  Activity,
  Play,
  Square,
  Pause,
  RotateCcw,
  Zap,
  Cpu,
  FileCode,
  Binary,
  ShieldAlert,
  Radio,
  Sliders,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { VehicleTelemetry } from '@/types/telemetry';

export const TelemetryPage: React.FC = () => {
  const {
    isRunning,
    isPaused,
    vehicleCount,
    targetEventsPerSec,
    batchSize,
    simulationSpeed,
    format,
    start,
    stop,
    pause,
    resume,
    setVehicleCount,
    setTargetRate,
    setBatchSize,
    setSimulationSpeed,
    setFormat,
    triggerManualBreach,
  } = useSimulatorStore();

  const { metrics } = useVehiclePositionStore();
  const [socketStatus, setSocketStatus] = useState(socketService.getStatus());
  const [recentSamplePackets, setRecentSamplePackets] = useState<VehicleTelemetry[]>([]);

  useEffect(() => {
    const unsub = socketService.onStatusChange((status) => {
      setSocketStatus(status);
    });
    return unsub;
  }, []);

  // Poll a small snapshot of latest packets for the live inspector
  useEffect(() => {
    const interval = setInterval(() => {
      const positions = positionStore.getAllPositions();
      if (positions.length > 0) {
        setRecentSamplePackets(positions.slice(0, 6));
      }
    }, 400);

    return () => clearInterval(interval);
  }, []);

  const scaleOptions: VehicleScaleCount[] = [100, 500, 1000, 2000, 5000, 10000];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Activity className="w-5 h-5 text-brand-electric" />
            High-Frequency Telemetry Ingestion Engine
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time packet decoder, binary ArrayBuffer adapters, mutable spatial buffers, and stress simulator.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge
            status={isRunning ? (isPaused ? 'idle' : 'active') : 'offline'}
            label={isRunning ? (isPaused ? 'SIM PAUSED' : 'SIM GENERATING') : 'SIM STOPPED'}
            pulse={isRunning && !isPaused}
          />
        </div>
      </div>

      {/* Real-time Ingestion Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-brand-electric">
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400 flex items-center justify-between">
              Throughput
              <Zap className="w-4 h-4 text-brand-electric" />
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">
                {metrics.eventsPerSec.toLocaleString()}
              </span>
              <span className="text-xs font-mono text-slate-400">evt/s</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
              Target: {targetEventsPerSec.toLocaleString()} evt/s
            </span>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400 flex items-center justify-between">
              Total Ingested
              <Cpu className="w-4 h-4 text-emerald-500" />
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                {metrics.totalProcessed.toLocaleString()}
              </span>
              <span className="text-xs font-mono text-slate-400">pkts</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
              Spatial map: {positionStore.getCount()} units
            </span>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400 flex items-center justify-between">
              Active / Breaches
              <ShieldAlert className="w-4 h-4 text-amber-500" />
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">
                {metrics.activeCount} <span className="text-xs font-normal text-rose-500">({metrics.breachCount} breaches)</span>
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
              Idle: {metrics.idleCount} • Offline: {metrics.offlineCount}
            </span>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-rose-500">
          <CardContent className="p-4">
            <span className="text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400 flex items-center justify-between">
              Rejected Packets
              <AlertTriangle className="w-4 h-4 text-rose-500" />
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">
                {metrics.rejectedPackets}
              </span>
              <span className="text-xs font-mono text-slate-400">rejected</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
              Boundary validation clean
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Simulator Controls & Format Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Interactive Simulator Controls */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Sliders className="w-4 h-4 text-brand-electric" />
                Telemetry Stream Simulator Controls
              </CardTitle>
              <span className="text-xs font-mono bg-blue-500/10 text-brand-electric px-2.5 py-0.5 rounded-full font-semibold">
                Frontend Deterministic Engine
              </span>
            </div>
            <CardDescription>
              Stress test high-frequency packet ingestion from 100 to 10,000 simulated vehicles
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Primary Action Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              {!isRunning ? (
                <Button variant="electric" size="md" onClick={start} className="gap-2">
                  <Play className="w-4 h-4 fill-white" />
                  Start Telemetry Stream
                </Button>
              ) : (
                <>
                  <Button variant="danger" size="md" onClick={stop} className="gap-2">
                    <Square className="w-4 h-4 fill-white" />
                    Stop Stream
                  </Button>

                  {isPaused ? (
                    <Button variant="outline" size="md" onClick={resume} className="gap-2">
                      <Play className="w-4 h-4" />
                      Resume
                    </Button>
                  ) : (
                    <Button variant="outline" size="md" onClick={pause} className="gap-2">
                      <Pause className="w-4 h-4" />
                      Pause
                    </Button>
                  )}
                </>
              )}

              <Button
                variant="outline"
                size="md"
                onClick={() => positionStore.clear()}
                className="gap-2 ml-auto"
                title="Reset buffers"
              >
                <RotateCcw className="w-4 h-4" />
                Clear Buffers
              </Button>

              <Button
                variant="outline"
                size="md"
                onClick={triggerManualBreach}
                className="gap-2 border-rose-500/40 text-rose-500 hover:bg-rose-500/10"
              >
                <ShieldAlert className="w-4 h-4" />
                Simulate Geofence Breach
              </Button>
            </div>

            {/* Fleet Scale Selection Tabs */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Fleet Scale Count:</span>
                <span className="font-mono text-brand-electric font-bold">{vehicleCount.toLocaleString()} Units</span>
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {scaleOptions.map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setVehicleCount(count)}
                    className={`py-2 px-3 rounded-lg text-xs font-mono font-bold transition border ${
                      vehicleCount === count
                        ? 'bg-brand-electric text-white border-brand-electric shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-brand-electric'
                    }`}
                  >
                    {count >= 1000 ? `${count / 1000}k` : count}
                  </button>
                ))}
              </div>
            </div>

            {/* Sliders: Events Per Sec & Batch Size */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Target Ingestion Rate:</span>
                  <span className="font-mono font-bold text-brand-electric">{targetEventsPerSec} evt/s</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="5000"
                  step="100"
                  value={targetEventsPerSec}
                  onChange={(e) => setTargetRate(Number(e.target.value))}
                  className="w-full accent-brand-electric cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>100 evt/s</span>
                  <span>2,500 evt/s</span>
                  <span>5,000 evt/s</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Socket Batch Size:</span>
                  <span className="font-mono font-bold text-brand-electric">{batchSize} pkts/batch</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="200"
                  step="10"
                  value={batchSize}
                  onChange={(e) => setBatchSize(Number(e.target.value))}
                  className="w-full accent-brand-electric cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>10 pkts</span>
                  <span>100 pkts</span>
                  <span>200 pkts</span>
                </div>
              </div>
            </div>

            {/* Format & Speed Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              {/* Encoding Format Selector */}
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300 block">Payload Protocol:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFormat('json')}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 transition ${
                      format === 'json'
                        ? 'bg-brand-navy dark:bg-slate-700 text-white border-transparent'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <FileCode className="w-3.5 h-3.5" />
                    <span>JSON Array</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormat('binary')}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 transition ${
                      format === 'binary'
                        ? 'bg-brand-navy dark:bg-slate-700 text-white border-transparent'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Binary className="w-3.5 h-3.5 text-brand-electric" />
                    <span>32-byte ArrayBuffer</span>
                  </button>
                </div>
              </div>

              {/* Simulation Speed Factor */}
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300 block">Velocity Factor:</span>
                <div className="flex items-center gap-2">
                  {[1, 2, 5].map((speed) => (
                    <button
                      key={speed}
                      type="button"
                      onClick={() => setSimulationSpeed(speed)}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-mono font-bold border transition ${
                        simulationSpeed === speed
                          ? 'bg-brand-electric text-white border-brand-electric'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right 1 Col: Socket.IO Gateway Diagnostics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-500 animate-pulse" />
              Socket.IO Gateway Connection
            </CardTitle>
            <CardDescription>Network transport & event contracts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Gateway URL:</span>
                <span className="font-mono text-slate-800 dark:text-slate-200 truncate max-w-[150px]">
                  {socketService.getUrl()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Socket State:</span>
                <StatusBadge
                  status={socketStatus === 'connected' ? 'connected' : 'disconnected'}
                  label={socketStatus.toUpperCase()}
                  pulse={socketStatus === 'connected'}
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Backoff Strategy:</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">Exponential (1s–10s)</span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                Active Ingestion Channels:
              </span>
              <ul className="space-y-1.5 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>telemetry:batch (Stream)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>geofence:breach (Alert)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>vehicle:updated (Delta)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>fleet:stats (Aggregate)</span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Stream Raw Packet Inspector */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Binary className="w-4 h-4 text-brand-electric" />
              Live Ingestion Packet Stream Inspector
            </CardTitle>
            <span className="text-[11px] font-mono text-slate-500">
              Format: {format === 'binary' ? 'ArrayBuffer (32-byte struct)' : 'JSON Object'}
            </span>
          </div>
          <CardDescription>
            Live snapshot of validated coordinates arriving in the spatial position store
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentSamplePackets.map((pkt) => (
              <div
                key={pkt.vehicleId}
                className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 font-mono text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-brand-electric">{pkt.vehicleId}</span>
                  <StatusBadge
                    status={pkt.geofenceStatus === 'breached' ? 'breach' : pkt.status}
                    size="sm"
                  />
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-300 space-y-0.5">
                  <p>LAT: {pkt.latitude.toFixed(6)} | LNG: {pkt.longitude.toFixed(6)}</p>
                  <p>SPD: {pkt.speed} km/h | HDG: {pkt.heading}°</p>
                  <p className="text-[10px] text-slate-400">TS: {pkt.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
