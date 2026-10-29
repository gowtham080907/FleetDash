import { create } from 'zustand';
import { VehicleTelemetry } from '@/types/telemetry';

export interface SpatialMetrics {
  totalProcessed: number;
  eventsPerSec: number;
  rejectedPackets: number;
  activeCount: number;
  idleCount: number;
  offlineCount: number;
  breachCount: number;
  lastPacketTime: number;
}

interface PositionStoreState {
  metrics: SpatialMetrics;
  selectedVehicleId: string | null;
  setSelectedVehicleId: (id: string | null) => void;
}

/**
 * High-performance mutable spatial storage.
 * Keeps vehicle coordinates outside the React component render lifecycle.
 * The Canvas engine accesses this directly at 60 FPS without triggering React re-renders.
 */
class MutablePositionStore {
  // Primary spatial lookup map: vehicleId -> VehicleTelemetry
  private positions = new Map<string, VehicleTelemetry>();

  // Flat cache array for rapid iteration in canvas render loops (zero allocation)
  private positionsArray: VehicleTelemetry[] = [];
  private isArrayDirty = true;

  // Rate tracking
  private totalProcessed = 0;
  private rejectedPackets = 0;
  private recentPacketCount = 0;
  private lastRateCheckTime = performance.now();
  private currentEventsPerSec = 0;

  // Throttled notification callbacks for low-frequency UI listeners
  private lowFrequencyListeners = new Set<(metrics: SpatialMetrics) => void>();
  private throttleTimeout: ReturnType<typeof setTimeout> | null = null;

  /**
   * Ingests a validated batch of telemetry updates.
   * Directly mutates the underlying map without triggering React re-renders.
   */
  public updateBatch(batch: VehicleTelemetry[], rejected = 0): void {
    if (batch.length === 0 && rejected === 0) return;

    this.totalProcessed += batch.length;
    this.rejectedPackets += rejected;
    this.recentPacketCount += batch.length;

    for (let i = 0; i < batch.length; i++) {
      const record = batch[i];
      const existing = this.positions.get(record.vehicleId);

      // Prevent out-of-order stale updates
      if (existing && existing.timestamp > record.timestamp) {
        continue;
      }

      this.positions.set(record.vehicleId, record);
    }

    this.isArrayDirty = true;
    this.scheduleMetricsUpdate();
  }

  /**
   * Clears all stored vehicle positions and resets metrics.
   */
  public clear(): void {
    this.positions.clear();
    this.positionsArray = [];
    this.isArrayDirty = false;
    this.totalProcessed = 0;
    this.rejectedPackets = 0;
    this.recentPacketCount = 0;
    this.currentEventsPerSec = 0;
    this.triggerMetrics();
  }

  /**
   * Returns a contiguous array of all current vehicle positions for Canvas drawing.
   * Rebuilds only when positions map was mutated.
   */
  public getAllPositions(): VehicleTelemetry[] {
    if (this.isArrayDirty) {
      this.positionsArray = Array.from(this.positions.values());
      this.isArrayDirty = false;
    }
    return this.positionsArray;
  }

  /**
   * Direct O(1) lookup of a single vehicle position.
   */
  public getPosition(vehicleId: string): VehicleTelemetry | undefined {
    return this.positions.get(vehicleId);
  }

  /**
   * Returns current active vehicle count.
   */
  public getCount(): number {
    return this.positions.size;
  }

  /**
   * Computes aggregated spatial metrics for UI cards and diagnostics.
   */
  public getMetrics(): SpatialMetrics {
    const now = performance.now();
    const elapsed = now - this.lastRateCheckTime;

    if (elapsed >= 1000) {
      this.currentEventsPerSec = Math.round((this.recentPacketCount * 1000) / elapsed);
      this.recentPacketCount = 0;
      this.lastRateCheckTime = now;
    }

    let active = 0;
    let idle = 0;
    let offline = 0;
    let breaches = 0;
    let lastTime = 0;

    for (const v of this.positions.values()) {
      if (v.status === 'active') active++;
      else if (v.status === 'idle') idle++;
      else if (v.status === 'offline') offline++;

      if (v.geofenceStatus === 'breached') breaches++;
      if (v.timestamp > lastTime) lastTime = v.timestamp;
    }

    return {
      totalProcessed: this.totalProcessed,
      eventsPerSec: this.currentEventsPerSec,
      rejectedPackets: this.rejectedPackets,
      activeCount: active,
      idleCount: idle,
      offlineCount: offline,
      breachCount: breaches,
      lastPacketTime: lastTime || Date.now(),
    };
  }

  public subscribeMetrics(listener: (metrics: SpatialMetrics) => void): () => void {
    this.lowFrequencyListeners.add(listener);
    return () => this.lowFrequencyListeners.delete(listener);
  }

  private scheduleMetricsUpdate(): void {
    if (this.throttleTimeout !== null) return;

    // Throttle UI notification to 4 times per second (250ms) to preserve CPU
    this.throttleTimeout = setTimeout(() => {
      this.throttleTimeout = null;
      this.triggerMetrics();
    }, 250);
  }

  private triggerMetrics(): void {
    const metrics = this.getMetrics();
    for (const listener of this.lowFrequencyListeners) {
      listener(metrics);
    }
  }
}

// Singleton mutable position store instance
export const positionStore = new MutablePositionStore();

// React Zustand store for low-frequency UI integration (e.g. selected vehicle, diagnostic stats)
export const useVehiclePositionStore = create<PositionStoreState>((set) => {
  // Sync with throttled position metrics
  positionStore.subscribeMetrics((metrics) => {
    set({ metrics });
  });

  return {
    metrics: positionStore.getMetrics(),
    selectedVehicleId: null,
    setSelectedVehicleId: (id) => set({ selectedVehicleId: id }),
  };
});
