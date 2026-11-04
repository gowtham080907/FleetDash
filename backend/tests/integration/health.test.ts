import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';

describe('GET /api/health Integration Tests', () => {
  it('returns HTTP 200 with standard health and worker pool status', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('service', 'fleetdash-backend');
    expect(typeof response.body.uptime).toBe('number');
    expect(response.body.uptime).toBeGreaterThanOrEqual(0);

    // Verify ISO-8601 timestamp format
    expect(typeof response.body.timestamp).toBe('string');
    const parsedDate = new Date(response.body.timestamp);
    expect(Number.isNaN(parsedDate.getTime())).toBe(false);

    // Verify worker status structure
    expect(response.body).toHaveProperty('worker');
    expect(typeof response.body.worker.ready).toBe('boolean');
    expect(typeof response.body.worker.poolSize).toBe('number');
    expect(response.body.worker.poolSize).toBeGreaterThan(0);
  });
});
