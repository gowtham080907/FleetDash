import { describe, it, expect, beforeEach } from 'vitest';
import { geofenceService } from '../../src/services/geofence.service';
import { GeofenceZone } from '../../src/types/geofence';
import { db } from '../../src/db/database';

describe('Geofence Engine Unit Tests', () => {
  beforeEach(async () => {
    await db.init();
  });

  it('accurately identifies point inside and outside circular geofence', () => {
    // Circle centered at (41.9742, -87.9073) with radius 5,000 meters
    const centerLat = 41.9742;
    const centerLon = -87.9073;
    const radiusMeters = 5000;

    // Point 500 meters away (inside)
    const inside = geofenceService.isPointInCircle(41.9750, -87.9080, centerLat, centerLon, radiusMeters);
    expect(inside).toBe(true);

    // Point 20,000 meters away (outside)
    const outside = geofenceService.isPointInCircle(41.7000, -87.6000, centerLat, centerLon, radiusMeters);
    expect(outside).toBe(false);
  });

  it('accurately identifies point inside and outside polygonal geofence using ray-casting', () => {
    // Polygon square around Chicago Loop
    const polygon: [number, number][] = [
      [41.9100, -87.7200],
      [41.9100, -87.6100],
      [41.8300, -87.6100],
      [41.8300, -87.7200],
    ];

    // Inside point (41.8781, -87.6298)
    const inside = geofenceService.isPointInPolygon(41.8781, -87.6298, polygon);
    expect(inside).toBe(true);

    // Outside point north of polygon (42.0500, -87.6500)
    const outsideNorth = geofenceService.isPointInPolygon(42.0500, -87.6500, polygon);
    expect(outsideNorth).toBe(false);

    // Outside point west of polygon (41.8700, -87.9000)
    const outsideWest = geofenceService.isPointInPolygon(41.8700, -87.9000, polygon);
    expect(outsideWest).toBe(false);
  });

  it('detects speed limit breach when speed exceeds zone threshold', () => {
    const testZone: GeofenceZone = {
      id: 'geo-test-speed',
      name: 'Test Speed Zone',
      type: 'circle',
      center: [41.8781, -87.6298],
      radiusMeters: 5000,
      color: '#FF0000',
      fillOpacity: 0.15,
      speedLimitKmH: 45,
      visible: true,
      activeVehiclesCount: 0,
      breachCount: 0,
    };
    db.createGeofence(testZone);

    // Vehicle inside with speed 85 km/h (> 45 km/h ceiling)
    const result = geofenceService.evaluatePoint({
      vehicleId: 'VH-SPEED-BREACH-01',
      latitude: 41.8785,
      longitude: -87.6295,
      speed: 85,
    });

    expect(result.status).toBe('breached');
    expect(result.breachedGeofences.some((z) => z.id === 'geo-test-speed')).toBe(true);
  });
});

