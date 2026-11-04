import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';
import { db } from '../../src/db/database';

describe('Auth & JWT Integration Tests', () => {
  beforeAll(async () => {
    await db.init();
  });

  it('authenticates demo user and returns JWT token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 's.jenkins@fleetdash.io', password: 'FleetDemo2026!' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('user');
    expect(res.body.user.email).toBe('s.jenkins@fleetdash.io');
    expect(res.body).toHaveProperty('token');
    expect(typeof res.body.token).toBe('string');
  });

  it('registers a new user and authenticates with JWT', async () => {
    const testEmail = `newuser-${Date.now()}@fleetdash.io`;
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'New Test User',
        email: testEmail,
        password: 'ValidPassword123!',
        role: 'fleet_manager',
        department: 'Regional Dispatch',
      });

    expect(regRes.status).toBe(201);
    expect(regRes.body).toHaveProperty('token');
    expect(regRes.body.user.email).toBe(testEmail);

    // Verify /api/auth/me using token
    const token = regRes.body.token;
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.user.email).toBe(testEmail);
  });

  it('rejects invalid password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@fleetdash.io', password: 'WrongPassword999!' });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error.code).toBe('AUTH_FAILED');
  });

  it('rejects /api/auth/me without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});
