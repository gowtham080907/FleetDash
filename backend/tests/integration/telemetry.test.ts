import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';
import { workerPool } from '../../src/services/workerPool.service';

describe('POST /api/telemetry/process-batch Integration Tests', () => {
  beforeAll(async () => {
    await workerPool.init();
  });

  afterAll(async () => {
    await workerPool.shutdown();
  });

  it('processes a valid coordinate batch and returns HTTP 200 with stats', async () => {
    const payload = {
      points: [
        {
          vehicleId: 'VH-1001',
          latitude: 17.385044,
          longitude: 78.486671,
          speed: 68.4,
          heading: 182.5,
          timestamp: 1704067200000,
          status: 'active',
        },
      ],
    };

    const res = await request(app)
      .post('/api/telemetry/process-batch')
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.requestId).toBe('string');
    expect(res.body.stats).toEqual(
      expect.objectContaining({
        received: 1,
        valid: 1,
        invalid: 0,
      })
    );
    expect(res.body.processed).toHaveLength(1);
    expect(res.body.rejected).toHaveLength(0);

    const processedPoint = res.body.processed[0];
    expect(processedPoint.vehicleId).toBe('VH-1001');
    expect(processedPoint.latitude).toBe(17.385044);
    expect(processedPoint.longitude).toBe(78.486671);
    expect(typeof processedPoint.processedAt).toBe('number');
  });

  it('handles a mixed batch with valid and invalid points, returning both', async () => {
    const payload = {
      points: [
        { vehicleId: 'V1', latitude: 17.385, longitude: 78.486 },
        { vehicleId: 'V2', latitude: 123.45, longitude: 78.486 }, // Invalid lat > 90
        { vehicleId: 'V3', latitude: -45.12, longitude: -190.5 }, // Invalid lon < -180
      ],
    };

    const res = await request(app)
      .post('/api/telemetry/process-batch')
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.stats.received).toBe(3);
    expect(res.body.stats.valid).toBe(1);
    expect(res.body.stats.invalid).toBe(2);

    expect(res.body.processed).toHaveLength(1);
    expect(res.body.processed[0].vehicleId).toBe('V1');

    expect(res.body.rejected).toHaveLength(2);
    expect(res.body.rejected[0].index).toBe(1);
    expect(res.body.rejected[0].reason).toContain('Latitude out of range');
    expect(res.body.rejected[1].index).toBe(2);
    expect(res.body.rejected[1].reason).toContain('Longitude out of range');
  });

  it('handles an all-invalid batch returning 200 with all points in rejected', async () => {
    const payload = {
      points: [
        { vehicleId: 'V1', latitude: 100, longitude: 50 },
        { vehicleId: 'V2', latitude: 20, longitude: 250 },
      ],
    };

    const res = await request(app)
      .post('/api/telemetry/process-batch')
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.stats.received).toBe(2);
    expect(res.body.stats.valid).toBe(0);
    expect(res.body.stats.invalid).toBe(2);
    expect(res.body.processed).toHaveLength(0);
    expect(res.body.rejected).toHaveLength(2);
  });

  it('rejects missing "points" field with HTTP 400', async () => {
    const res = await request(app)
      .post('/api/telemetry/process-batch')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty('code', 'MISSING_POINTS_FIELD');
  });

  it('rejects non-array "points" with HTTP 400', async () => {
    const res = await request(app)
      .post('/api/telemetry/process-batch')
      .send({ points: 'not-an-array' });

    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty('code', 'POINTS_NOT_ARRAY');
  });

  it('rejects empty "points" array with HTTP 400', async () => {
    const res = await request(app)
      .post('/api/telemetry/process-batch')
      .send({ points: [] });

    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty('code', 'EMPTY_BATCH');
  });

  it('rejects non-object request body with HTTP 400', async () => {
    const res = await request(app)
      .post('/api/telemetry/process-batch')
      .set('Content-Type', 'application/json')
      .send('[1, 2, 3]');

    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty('code', 'INVALID_REQUEST_BODY');
  });

  it('rejects oversize batch exceeding MAX_BATCH_SIZE with HTTP 413', async () => {
    // Generate batch with 10,001 points (exceeding default 10,000)
    const largePoints = new Array(10001).fill({ vehicleId: 'V1', latitude: 10, longitude: 20 });

    const res = await request(app)
      .post('/api/telemetry/process-batch')
      .send({ points: largePoints });

    expect(res.status).toBe(413);
    expect(res.body.error).toHaveProperty('code', 'BATCH_TOO_LARGE');
  });

  it('returns clean HTTP 400 on malformed JSON without stack trace', async () => {
    const res = await request(app)
      .post('/api/telemetry/process-batch')
      .set('Content-Type', 'application/json')
      .send('{"points": [bad json}');

    expect(res.status).toBe(400);
    expect(res.body.error).toHaveProperty('code', 'MALFORMED_JSON');
    expect(res.body.error.message).toContain('Malformed JSON');
    expect(res.body.error.details).toEqual([]);
    expect(res.text).not.toContain('SyntaxError:');
  });

  it('returns clean HTTP 404 on unknown route with standard error format', async () => {
    const res = await request(app).get('/api/unknown-endpoint');

    expect(res.status).toBe(404);
    expect(res.body.error).toHaveProperty('code', 'ROUTE_NOT_FOUND');
    expect(res.body.error.message).toContain('not found');
  });
});
