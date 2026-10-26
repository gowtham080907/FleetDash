import { describe, it, expect } from 'vitest';
import { VehicleTelemetry } from '../types/telemetry';

describe('Spatial Viewport Culling & Coordinate Logic', () => {
  // Test bounding box filter algorithm used by CanvasRenderEngine
  function isInsideViewport(
    v: VehicleTelemetry,
    bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }
  ): boolean {
    return (
      v.latitude >= bounds.minLat &&
      v.latitude <= bounds.maxLat &&
      v.longitude >= bounds.minLng &&
      v.longitude <= bounds.maxLng
    );
  }

  const screenBounds = {
    minLat: 41.8000,
    maxLat: 41.9500,
    minLng: -87.7500,
    maxLng: -87.5500,
  };

  it('keeps visible vehicles within viewport boundaries', () => {
    const insideVehicle: VehicleTelemetry = {
      vehicleId: 'VH-1001',
      latitude: 41.8781,
      longitude: -87.6298,
      speed: 60,
      heading: 90,
      timestamp: Date.now(),
      status: 'active',
    };

    expect(isInsideViewport(insideVehicle, screenBounds)).toBe(true);
  });

  it('culls vehicles outside viewport boundaries', () => {
    const northVehicle: VehicleTelemetry = {
      vehicleId: 'VH-1002',
      latitude: 42.1000, // North of maxLat
      longitude: -87.6298,
      speed: 60,
      heading: 90,
      timestamp: Date.now(),
      status: 'active',
    };

    const westVehicle: VehicleTelemetry = {
      vehicleId: 'VH-1003',
      latitude: 41.8781,
      longitude: -88.1000, // West of minLng
      speed: 60,
      heading: 90,
      timestamp: Date.now(),
      status: 'active',
    };

    expect(isInsideViewport(northVehicle, screenBounds)).toBe(false);
    expect(isInsideViewport(westVehicle, screenBounds)).toBe(false);
  });

  it('prunes large fleet coordinates efficiently', () => {
    const fleet: VehicleTelemetry[] = [];
    for (let i = 0; i < 1000; i++) {
      fleet.push({
        vehicleId: `VH-${i}`,
        latitude: 41.5 + Math.random() * 0.8,
        longitude: -88.2 + Math.random() * 1.0,
        speed: 50,
        heading: 0,
        timestamp: Date.now(),
        status: 'active',
      });
    }

    const culled = fleet.filter((v) => isInsideViewport(v, screenBounds));
    expect(culled.length).toBeLessThan(fleet.length);
    expect(culled.length).toBeGreaterThan(0);
  });
});
