import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';
import { db } from '../../src/db/database';

describe('Vehicle CRUD & Fleet Stats REST API Tests', () => {
  beforeAll(async () => {
    await db.init();
  });

  it('GET /api/vehicles returns paginated vehicle list', async () => {
    const res = await request(app).get('/api/vehicles?page=1&pageSize=10');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBeLessThanOrEqual(10);
    expect(res.body).toHaveProperty('total');
    expect(res.body.total).toBeGreaterThanOrEqual(10);
    expect(res.body.page).toBe(1);
    expect(res.body.pageSize).toBe(10);
  });

  it('GET /api/vehicles/:id returns a specific vehicle', async () => {
    const listRes = await request(app).get('/api/vehicles?pageSize=1');
    const firstId = listRes.body.items[0].id;

    const res = await request(app).get(`/api/vehicles/${firstId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(firstId);
    expect(res.body).toHaveProperty('speed');
    expect(res.body).toHaveProperty('latitude');
    expect(res.body).toHaveProperty('longitude');
  });

  it('POST /api/vehicles registers a new vehicle successfully', async () => {
    const newId = `VH-TEST-${Date.now().toString().slice(-4)}`;
    const payload = {
      id: newId,
      name: `Test Unit ${newId}`,
      driverName: 'Alexander Drake',
      model: 'Tesla Semi Prototype',
      status: 'idle',
      speed: 0,
      heading: 90,
      latitude: 41.8800,
      longitude: -87.6300,
      fuelLevel: 95,
    };

    const res = await request(app).post('/api/vehicles').send(payload);
    expect(res.status).toBe(201);
    expect(res.body.id).toBe(newId);
    expect(res.body.driverName).toBe('Alexander Drake');

    // Confirm existence via GET
    const checkRes = await request(app).get(`/api/vehicles/${newId}`);
    expect(checkRes.status).toBe(200);
    expect(checkRes.body.name).toBe(`Test Unit ${newId}`);
  });

  it('PUT /api/vehicles/:id updates an existing vehicle', async () => {
    const listRes = await request(app).get('/api/vehicles?pageSize=1');
    const vehicleId = listRes.body.items[0].id;

    const updatePayload = {
      driverName: 'Updated Test Driver',
      fuelLevel: 99,
    };

    const res = await request(app).put(`/api/vehicles/${vehicleId}`).send(updatePayload);
    expect(res.status).toBe(200);
    expect(res.body.driverName).toBe('Updated Test Driver');
    expect(res.body.fuelLevel).toBe(99);
  });

  it('GET /api/vehicles/:id/history returns breadcrumbs', async () => {
    const listRes = await request(app).get('/api/vehicles?pageSize=1');
    const vehicleId = listRes.body.items[0].id;

    const res = await request(app).get(`/api/vehicles/${vehicleId}/history`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('vehicleId', vehicleId);
    expect(Array.isArray(res.body.breadcrumbs)).toBe(true);
  });

  it('GET /api/fleet/stats returns aggregated fleet KPIs', async () => {
    const res = await request(app).get('/api/fleet/stats');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('totalVehicles');
    expect(res.body.totalVehicles).toBeGreaterThan(0);
    expect(res.body).toHaveProperty('activeVehicles');
    expect(res.body).toHaveProperty('idleVehicles');
    expect(res.body).toHaveProperty('offlineVehicles');
    expect(res.body).toHaveProperty('averageSpeed');
  });

  it('GET /api/telemetry/stats returns dashboard chart analytics', async () => {
    const res = await request(app).get('/api/telemetry/stats');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('statusDistribution');
    expect(res.body).toHaveProperty('activityTrends');
    expect(res.body).toHaveProperty('throughputHistory');
    expect(res.body).toHaveProperty('speedDistribution');
    expect(res.body).toHaveProperty('alertBreakdown');
  });
});

