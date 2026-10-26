import { create } from 'zustand';
import { VehicleTelemetry, BinaryProtocolFormat, GeofenceEventPayload } from '@/types/telemetry';
import { encodeBinaryBatch } from '@/services/telemetry/binaryDecoder';
import { socketService } from '@/services/socket/socketService';

export type VehicleScaleCount = 100 | 500 | 1000 | 2000 | 5000 | 10000;

interface InternalSimVehicle {
  id: string;
  numId: number;
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  status: 'active' | 'idle' | 'offline';
  geofenceStatus: 'inside' | 'breached' | 'clear' | 'none';
  turnRate: number;
  speedVariation: number;
}

// Bounding box for Chicago Greater Logistics Metropolitan Zone
const GEO_BOUNDS = {
  minLat: 41.7000,
  maxLat: 42.0500,
  minLng: -87.9000,
  maxLng: -87.5200,
};

// Geofence Zone coordinates for breach detection
const PERIMETER_ZONES = [
  { name: 'O\'Hare Logistics Air Hub', lat: 41.9742, lng: -87.9073, radiusKm: 8 },
  { name: 'South Shore Marine Terminal', lat: 41.7580, lng: -87.5540, radiusKm: 6 },
  { name: 'Midwest Central Freight Depot', lat: 41.8781, lng: -87.6500, radiusKm: 7 },
];

class TelemetrySimulatorEngine {
  private isRunning = false;
  private isPaused = false;
  private timerId: ReturnType<typeof setInterval> | null = null;

  // Simulator configurations
  private vehicleCount: VehicleScaleCount = 500;
  private targetEventsPerSec = 1500;
  private batchSize = 50;
  private simulationSpeed = 1; // 1x, 2x, 5x
  private format: BinaryProtocolFormat = 'json';

  private vehicles: InternalSimVehicle[] = [];
  private nextVehicleIndex = 0;

  constructor() {
    this.initFleet(this.vehicleCount);
  }

  public initFleet(count: VehicleScaleCount): void {
    this.vehicleCount = count;
    this.vehicles = [];

    const centerLat = 41.8781;
    const centerLng = -87.6298;

    for (let i = 1; i <= count; i++) {
      // Status distribution: 70% active, 20% idle, 10% offline
      const rand = Math.random();
      const status: 'active' | 'idle' | 'offline' =
        rand < 0.70 ? 'active' : rand < 0.90 ? 'idle' : 'offline';

      const speed = status === 'active' ? Math.floor(35 + Math.random() * 65) : 0;
      const heading = Math.floor(Math.random() * 360);

      // Spread inside geographic bounds
      const radius = Math.sqrt(Math.random()) * 0.18;
      const angle = Math.random() * 2 * Math.PI;
      const lat = centerLat + radius * Math.sin(angle);
      const lng = centerLng + radius * Math.cos(angle);

      this.vehicles.push({
        id: `VH-${1000 + i}`,
        numId: 1000 + i,
        lat,
        lng,
        speed,
        heading,
        status,
        geofenceStatus: i % 35 === 0 ? 'breached' : 'inside',
        turnRate: (Math.random() - 0.5) * 4,
        speedVariation: (Math.random() - 0.5) * 2,
      });
    }

    this.nextVehicleIndex = 0;
  }

  public start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.isPaused = false;
    this.scheduleInterval();
  }

  public stop(): void {
    this.isRunning = false;
    this.isPaused = false;
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  public pause(): void {
    this.isPaused = true;
  }

  public resume(): void {
    this.isPaused = false;
  }

  public setVehicleCount(count: VehicleScaleCount): void {
    this.vehicleCount = count;
    this.initFleet(count);
  }

  public setBatchSize(size: number): void {
    this.batchSize = Math.max(5, Math.min(size, 250));
    if (this.isRunning) {
      this.reschedule();
    }
  }

  public setTargetRate(rate: number): void {
    this.targetEventsPerSec = Math.max(50, Math.min(rate, 10000));
    if (this.isRunning) {
      this.reschedule();
    }
  }

  public setSimulationSpeed(speed: number): void {
    this.simulationSpeed = speed;
  }

  public setFormat(format: BinaryProtocolFormat): void {
    this.format = format;
  }

  public getSettings() {
    return {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      vehicleCount: this.vehicleCount,
      targetEventsPerSec: this.targetEventsPerSec,
      batchSize: this.batchSize,
      simulationSpeed: this.simulationSpeed,
      format: this.format,
    };
  }

  /**
   * Generates a one-shot intentional geofence breach event for interactive testing.
   */
  public triggerManualBreach(): void {
    if (this.vehicles.length === 0) return;
    const target = this.vehicles[Math.floor(Math.random() * this.vehicles.length)];
    target.geofenceStatus = 'breached';
    target.speed = Math.floor(75 + Math.random() * 30);

    const zone = PERIMETER_ZONES[Math.floor(Math.random() * PERIMETER_ZONES.length)];

    const breachPayload: GeofenceEventPayload = {
      eventId: `ev-br-${Date.now()}`,
      vehicleId: target.id,
      geofenceId: zone.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      geofenceName: zone.name,
      type: 'breach',
      timestamp: Date.now(),
      latitude: target.lat,
      longitude: target.lng,
      speed: target.speed,
    };

    socketService.dispatch('geofence:breach', breachPayload);
  }

  private reschedule(): void {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.scheduleInterval();
  }

  private scheduleInterval(): void {
    // intervalMs = (batchSize / targetEventsPerSec) * 1000
    const batchesPerSec = this.targetEventsPerSec / this.batchSize;
    const intervalMs = Math.max(16, Math.round(1000 / batchesPerSec)); // minimum 16ms (~60Hz tick)

    this.timerId = setInterval(() => {
      if (!this.isPaused && this.isRunning) {
        this.stepSimulation();
      }
    }, intervalMs);
  }

  private stepSimulation(): void {
    const batch: VehicleTelemetry[] = [];
    const now = Date.now();
    const count = this.vehicles.length;
    if (count === 0) return;

    for (let i = 0; i < this.batchSize; i++) {
      const idx = this.nextVehicleIndex % count;
      this.nextVehicleIndex = (this.nextVehicleIndex + 1) % count;

      const v = this.vehicles[idx];

      // Physics vector updates for active vehicles
      if (v.status === 'active') {
        // Adjust speed slightly
        v.speed = Math.max(20, Math.min(105, v.speed + v.speedVariation));
        if (Math.random() < 0.05) v.speedVariation = (Math.random() - 0.5) * 3;

        // Turn angle
        v.heading = (v.heading + v.turnRate * this.simulationSpeed + 360) % 360;
        if (Math.random() < 0.04) v.turnRate = (Math.random() - 0.5) * 6;

        // Velocity components: dx = speed * sin(heading), dy = speed * cos(heading)
        // 1 km/h ~= 0.0000025 deg/sec at Chicago latitude
        const distanceDeg = (v.speed / 3600) * 0.009 * this.simulationSpeed;
        const rad = (v.heading * Math.PI) / 180;

        v.lat += distanceDeg * Math.cos(rad);
        v.lng += distanceDeg * Math.sin(rad);

        // Bounce back into bounds if reaching border
        if (v.lat < GEO_BOUNDS.minLat) { v.lat = GEO_BOUNDS.minLat; v.heading = 0; }
        if (v.lat > GEO_BOUNDS.maxLat) { v.lat = GEO_BOUNDS.maxLat; v.heading = 180; }
        if (v.lng < GEO_BOUNDS.minLng) { v.lng = GEO_BOUNDS.minLng; v.heading = 90; }
        if (v.lng > GEO_BOUNDS.maxLng) { v.lng = GEO_BOUNDS.maxLng; v.heading = 270; }
      }

      batch.push({
        vehicleId: v.id,
        latitude: v.lat,
        longitude: v.lng,
        speed: v.speed,
        heading: v.heading,
        timestamp: now,
        status: v.status,
        geofenceStatus: v.geofenceStatus,
      });
    }

    // Dispatch batch in selected format (JSON array or ArrayBuffer)
    if (this.format === 'binary') {
      const binaryPayload = encodeBinaryBatch(batch);
      socketService.dispatch('telemetry:batch', binaryPayload);
    } else {
      socketService.dispatch('telemetry:batch', batch);
    }
  }
}

export const simulatorEngine = new TelemetrySimulatorEngine();

interface SimulatorState {
  isRunning: boolean;
  isPaused: boolean;
  vehicleCount: VehicleScaleCount;
  targetEventsPerSec: number;
  batchSize: number;
  simulationSpeed: number;
  format: BinaryProtocolFormat;
  start: () => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  setVehicleCount: (c: VehicleScaleCount) => void;
  setTargetRate: (r: number) => void;
  setBatchSize: (b: number) => void;
  setSimulationSpeed: (s: number) => void;
  setFormat: (f: BinaryProtocolFormat) => void;
  triggerManualBreach: () => void;
}

export const useSimulatorStore = create<SimulatorState>((set) => ({
  ...simulatorEngine.getSettings(),
  start: () => {
    simulatorEngine.start();
    set({ isRunning: true, isPaused: false });
  },
  stop: () => {
    simulatorEngine.stop();
    set({ isRunning: false, isPaused: false });
  },
  pause: () => {
    simulatorEngine.pause();
    set({ isPaused: true });
  },
  resume: () => {
    simulatorEngine.resume();
    set({ isPaused: false });
  },
  setVehicleCount: (c) => {
    simulatorEngine.setVehicleCount(c);
    set({ vehicleCount: c });
  },
  setTargetRate: (r) => {
    simulatorEngine.setTargetRate(r);
    set({ targetEventsPerSec: r });
  },
  setBatchSize: (b) => {
    simulatorEngine.setBatchSize(b);
    set({ batchSize: b });
  },
  setSimulationSpeed: (s) => {
    simulatorEngine.setSimulationSpeed(s);
    set({ simulationSpeed: s });
  },
  setFormat: (f) => {
    simulatorEngine.setFormat(f);
    set({ format: f });
  },
  triggerManualBreach: () => {
    simulatorEngine.triggerManualBreach();
  },
}));
