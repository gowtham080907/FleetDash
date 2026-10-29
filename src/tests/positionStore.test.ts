import { describe, it, expect, beforeEach } from 'vitest';
import { positionStore } from '../stores/vehiclePositionStore';
import { VehicleTelemetry } from '../types/telemetry';

describe('Mutable Position Store', () => {
  beforeEach(() => {
    positionStore.clear();
  });

  it('ingests batch updates without throwing', () => {
    const batch: VehicleTelemetry[] = [
      { vehicleId: 'VH-1001', latitude: 41.8781, longitude: -87.6298, speed: 60, heading: 90, timestamp: 1000, status: 'active' },
      { vehicleId: 'VH-1002', latitude: 41.8800, longitude: -87.6300, speed: 45, heading: 180, timestamp: 1000, status: 'idle' },
    ];

    positionStore.updateBatch(batch);
    expect(positionStore.getCount()).toBe(2);

    const v1 = positionStore.getPosition('VH-1001');
    expect(v1?.speed).toBe(60);
    expect(v1?.status).toBe('active');
  });

  it('rejects stale out-of-order telemetry updates', () => {
    const fresh: VehicleTelemetry = {
      vehicleId: 'VH-1001',
      latitude: 41.8781,
      longitude: -87.6298,
      speed: 70,
      heading: 90,
      timestamp: 2000,
      status: 'active',
    };

    const stale: VehicleTelemetry = {
      vehicleId: 'VH-1001',
      latitude: 41.8700,
      longitude: -87.6200,
      speed: 50,
      heading: 45,
      timestamp: 1000, // Older timestamp
      status: 'active',
    };

    positionStore.updateBatch([fresh]);
    positionStore.updateBatch([stale]); // Should be ignored

    const stored = positionStore.getPosition('VH-1001');
    expect(stored?.speed).toBe(70);
    expect(stored?.timestamp).toBe(2000);
  });

  it('returns contiguous position array for rendering', () => {
    const batch: VehicleTelemetry[] = [
      { vehicleId: 'VH-1', latitude: 41.0, longitude: -87.0, speed: 50, heading: 0, timestamp: 1000, status: 'active' },
      { vehicleId: 'VH-2', latitude: 41.1, longitude: -87.1, speed: 0, heading: 0, timestamp: 1000, status: 'idle' },
      { vehicleId: 'VH-3', latitude: 41.2, longitude: -87.2, speed: 0, heading: 0, timestamp: 1000, status: 'offline' },
    ];

    positionStore.updateBatch(batch);
    const array = positionStore.getAllPositions();

    expect(array.length).toBe(3);
    const metrics = positionStore.getMetrics();
    expect(metrics.activeCount).toBe(1);
    expect(metrics.idleCount).toBe(1);
    expect(metrics.offlineCount).toBe(1);
  });
});
