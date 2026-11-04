import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { db } from '../../src/db/database';

describe('FleetDash database read model and persistence contract', () => {
  beforeAll(async () => { await db.init(); });
  afterAll(async () => { if (process.env.MONGO_TEST_URL) await db.close(); });

  it('loads the expected seeded fleet and reference data', () => {
    expect(db.getAllVehicles().length).toBeGreaterThanOrEqual(60);
    expect(db.getGeofences().length).toBeGreaterThanOrEqual(4);
    expect(db.getUserByEmail('s.jenkins@fleetdash.io')).not.toBeNull();
  });

  it('supports vehicle create, update, filter, and delete without changing the API contract', () => {
    const id = 'TEST-DB-VEHICLE';
    db.createVehicle({ id, name: 'Database Test Vehicle', status: 'idle', speed: 0, heading: 0, latitude: 17.385, longitude: 78.4867, lastUpdated: Date.now(), geofenceStatus: 'inside' });
    expect(db.getVehicleById(id)?.name).toBe('Database Test Vehicle');
    expect(db.updateVehicle(id, { speed: 42, status: 'active' })?.speed).toBe(42);
    expect(db.getVehicles({ search: 'Database Test Vehicle' }).items.some((v) => v.id === id)).toBe(true);
    expect(db.deleteVehicle(id)).toBe(true);
    expect(db.getVehicleById(id)).toBeNull();
  });

  it('stores telemetry trails and returns the latest points first', () => {
    const id = 'TEST-TELEMETRY-VEHICLE';
    db.updateTelemetryPosition({ vehicleId: id, latitude: 17.385, longitude: 78.4867, speed: 48, timestamp: 1000 });
    db.updateTelemetryPosition({ vehicleId: id, latitude: 17.386, longitude: 78.4877, speed: 52, timestamp: 2000 });
    const trail = db.getBreadcrumbs(id);
    expect(trail.length).toBeGreaterThanOrEqual(2);
    expect(trail[0]?.timestamp).toBe(2000);
    db.deleteVehicle(id);
  });
});
