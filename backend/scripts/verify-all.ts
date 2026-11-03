import { io } from 'socket.io-client';
import fs from 'fs';
import path from 'path';

const API_BASE = 'http://localhost:5000/api';
const SOCKET_URL = 'http://localhost:5000';

interface VerificationResult {
  step: string;
  status: 'PASSED' | 'FAILED';
  details?: string;
}

const results: VerificationResult[] = [];

function record(step: string, passed: boolean, details?: string) {
  results.push({
    step,
    status: passed ? 'PASSED' : 'FAILED',
    details,
  });
  const symbol = passed ? '✅' : '❌';
  console.log(`${symbol} [${passed ? 'PASS' : 'FAIL'}] ${step}${details ? ` -> ${details}` : ''}`);
  if (!passed) {
    throw new Error(`Verification step failed: ${step} (${details})`);
  }
}

async function runVerification() {
  console.log('========================================================');
  console.log(' FLEETDASH FULL SYSTEM VERIFICATION PROTOCOL');
  console.log('========================================================\n');

  // --- 1. HEALTH ENDPOINT ---
  try {
    const res = await fetch(`${API_BASE}/health`);
    const data = await res.json();
    record('GET /api/health', res.status === 200 && data.status === 'ok', `Uptime: ${data.uptime}s, Workers: ${data.worker.poolSize}`);
  } catch (err: any) {
    record('GET /api/health', false, err.message);
  }

  // --- 2. AUTHENTICATION & JWT ---
  let jwtToken = '';
  try {
    // 2.1 Demo login
    const demoRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 's.jenkins@fleetdash.io', password: 'FleetDemo2026!' }),
    });
    const demoData = await demoRes.json();
    jwtToken = demoData.token;
    record('POST /api/auth/login (Demo Operator)', demoRes.status === 200 && Boolean(jwtToken), `Received token: ${jwtToken.substring(0, 20)}...`);

    // 2.2 Standard password validation failure
    const badRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@fleetdash.io', password: 'WrongPassword999!' }),
    });
    record('POST /api/auth/login (Reject Invalid Password)', badRes.status === 401);

    // 2.3 Registration
    const testEmail = `verify-${Date.now()}@fleetdash.io`;
    const regRes = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Verification User',
        email: testEmail,
        password: 'SecurePassword123!',
        role: 'fleet_manager',
      }),
    });
    const regData = await regRes.json();
    record('POST /api/auth/register (New User)', regRes.status === 201 && regData.user.email === testEmail);

    // 2.4 Protected route with JWT
    const meRes = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${jwtToken}` },
    });
    const meData = await meRes.json();
    record('GET /api/auth/me (Protected Route with JWT)', meRes.status === 200 && meData.user.email === 's.jenkins@fleetdash.io');

    // 2.5 Protected route without JWT
    const meNoAuth = await fetch(`${API_BASE}/auth/me`);
    record('GET /api/auth/me (Reject Unauthenticated Request)', meNoAuth.status === 401);
  } catch (err: any) {
    record('Authentication Tests', false, err.message);
  }

  // --- 3. FLEET STATS & ANALYTICS ---
  try {
    const statsRes = await fetch(`${API_BASE}/fleet/stats`);
    const stats = await statsRes.json();
    record('GET /api/fleet/stats', statsRes.status === 200 && stats.totalVehicles > 0, `Total: ${stats.totalVehicles}, Active: ${stats.activeVehicles}, Speed: ${stats.averageSpeed}km/h`);

    const analyticsRes = await fetch(`${API_BASE}/telemetry/stats`);
    const analytics = await analyticsRes.json();
    record('GET /api/telemetry/stats', analyticsRes.status === 200 && Array.isArray(analytics.statusDistribution), `Distribution slices: ${analytics.statusDistribution.length}, Activity points: ${analytics.activityTrends.length}`);
  } catch (err: any) {
    record('Fleet Stats & Analytics', false, err.message);
  }

  // --- 4. VEHICLE CRUD & SEARCH ---
  const testVehicleId = `VH-VERIFY-${Date.now().toString().slice(-4)}`;
  try {
    // 4.1 Paginated list
    const listRes = await fetch(`${API_BASE}/vehicles?page=1&pageSize=5`);
    const list = await listRes.json();
    record('GET /api/vehicles (Pagination)', listRes.status === 200 && list.items.length === 5 && list.total > 0, `Page 1/5 returned ${list.items.length} units`);

    // 4.2 Create Vehicle
    const createRes = await fetch(`${API_BASE}/vehicles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwtToken}`,
      },
      body: JSON.stringify({
        id: testVehicleId,
        name: `Verification Unit ${testVehicleId}`,
        driverName: 'Test Driver Alpha',
        model: 'Kenworth Autonomous T680',
        status: 'active',
        speed: 62.5,
        heading: 270,
        latitude: 41.8812,
        longitude: -87.6350,
      }),
    });
    record('POST /api/vehicles (Create Asset)', createRes.status === 201);

    // 4.3 Get Single Vehicle
    const singleRes = await fetch(`${API_BASE}/vehicles/${testVehicleId}`);
    const single = await singleRes.json();
    record('GET /api/vehicles/:id', singleRes.status === 200 && single.id === testVehicleId, `Name: ${single.name}, Driver: ${single.driverName}`);

    // 4.4 Update Vehicle
    const updateRes = await fetch(`${API_BASE}/vehicles/${testVehicleId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwtToken}`,
      },
      body: JSON.stringify({ driverName: 'Updated Driver Beta', status: 'idle', speed: 0 }),
    });
    const updated = await updateRes.json();
    record('PUT /api/vehicles/:id', updateRes.status === 200 && updated.driverName === 'Updated Driver Beta' && updated.status === 'idle');

    // 4.5 Vehicle History
    const historyRes = await fetch(`${API_BASE}/vehicles/${testVehicleId}/history`);
    const history = await historyRes.json();
    record('GET /api/vehicles/:id/history', historyRes.status === 200 && Array.isArray(history.breadcrumbs));

    // 4.6 Delete Vehicle
    const deleteRes = await fetch(`${API_BASE}/vehicles/${testVehicleId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${jwtToken}` },
    });
    record('DELETE /api/vehicles/:id', deleteRes.status === 200);

    // 4.7 Verify 404 after deletion
    const verifyDel = await fetch(`${API_BASE}/vehicles/${testVehicleId}`);
    record('GET /api/vehicles/:id (Confirmed 404 after deletion)', verifyDel.status === 404);
  } catch (err: any) {
    record('Vehicle Operations', false, err.message);
  }

  // --- 5. GEOFENCING CRUD & BREACH DETECTION ---
  const testZoneId = `geo-verify-${Date.now()}`;
  try {
    // 5.1 List Geofences
    const geoListRes = await fetch(`${API_BASE}/geofences`);
    const geoList = await geoListRes.json();
    record('GET /api/geofences', geoListRes.status === 200 && geoList.length >= 4, `Found ${geoList.length} active perimeters`);

    // 5.2 Create Geofence
    const geoCreateRes = await fetch(`${API_BASE}/geofences`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwtToken}`,
      },
      body: JSON.stringify({
        name: 'Verification Transit Bay',
        type: 'circle',
        center: [41.8781, -87.6298],
        radiusMeters: 3000,
        speedLimitKmH: 40,
        color: '#10B981',
      }),
    });
    const createdZone = await geoCreateRes.json();
    record('POST /api/geofences (Deploy New Perimeter)', geoCreateRes.status === 201 && Boolean(createdZone.id), `Created ID: ${createdZone.id}`);

    // 5.3 Delete test geofence
    const geoDelRes = await fetch(`${API_BASE}/geofences/${createdZone.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${jwtToken}` },
    });
    record('DELETE /api/geofences/:id', geoDelRes.status === 200);
  } catch (err: any) {
    record('Geofence Operations', false, err.message);
  }

  // --- 6. TELEMETRY INGESTION & AUTOMATED BREACH TRIGGER ---
  try {
    // Ingest a batch with vehicle VH-1001 inside O'Hare Hub with speed 98 km/h (> 45 km/h limit)
    const ingestRes = await fetch(`${API_BASE}/telemetry/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        points: [
          {
            vehicleId: 'VH-1001',
            latitude: 41.9745,
            longitude: -87.9075,
            speed: 98.4,
            heading: 140,
            status: 'active',
          },
        ],
      }),
    });
    const ingestData = await ingestRes.json();
    record('POST /api/telemetry/ingest (Batch Ingestion)', ingestRes.status === 202 && ingestData.accepted === 1, `Accepted: ${ingestData.accepted}, Published: ${ingestData.published}`);

    // Verify alert generated
    const alertsRes = await fetch(`${API_BASE}/alerts?limit=5`);
    const alerts = await alertsRes.json();
    const breachAlert = alerts.find((a: any) => a.vehicleId === 'VH-1001' && a.type === 'breach');
    record('Geofence Breach Engine Auto-Trigger', Boolean(breachAlert), `Alert ID: ${breachAlert?.id}, Speed: ${breachAlert?.speed}km/h in ${breachAlert?.geofenceName}`);

    // Acknowledge alert
    if (breachAlert) {
      const ackRes = await fetch(`${API_BASE}/alerts/${breachAlert.id}/ack`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${jwtToken}` },
      });
      const ackData = await ackRes.json();
      record('POST /api/alerts/:id/ack (Alert Acknowledgment)', ackRes.status === 200 && ackData.acknowledged === true);
    }
  } catch (err: any) {
    record('Telemetry & Alerts Engine', false, err.message);
  }

  // --- 7. SOCKET.IO REAL-TIME DUPLEX COMMUNICATION ---
  try {
    await new Promise<void>((resolve, reject) => {
      const socket = io(SOCKET_URL, {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        timeout: 4000,
      });

      let receivedBatch = false;

      socket.on('connect', () => {
        record('Socket.IO Connection', true, `Connected with Socket ID: ${socket.id}`);

        // Listen for binary telemetry:batch
        socket.on('telemetry:batch', (data: ArrayBuffer | Buffer) => {
          const byteLength = data.byteLength || (data as Buffer).length;
          receivedBatch = true;
          record('Socket.IO Binary Streaming (telemetry:batch)', byteLength >= 32, `Received binary buffer of ${byteLength} bytes (${byteLength / 32} frames)`);
          socket.disconnect();
          resolve();
        });

        // Trigger an ingestion to cause immediate broadcast
        void fetch(`${API_BASE}/telemetry/ingest`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            points: [
              {
                vehicleId: 'VH-1002',
                latitude: 41.8800,
                longitude: -87.6300,
                speed: 45,
                heading: 90,
                status: 'active',
              },
            ],
          }),
        });
      });

      socket.on('connect_error', (err) => {
        socket.disconnect();
        reject(err);
      });

      setTimeout(() => {
        if (!receivedBatch) {
          socket.disconnect();
          reject(new Error('Timed out waiting for Socket.IO telemetry:batch broadcast'));
        }
      }, 5000);
    });
  } catch (err: any) {
    record('Socket.IO Real-Time Streaming', false, err.message);
  }

  // --- 8. DATABASE PERSISTENCE VERIFICATION ---
  try {
    const dataPath = path.resolve(process.cwd(), 'data', 'fleetdash.json');
    const exists = fs.existsSync(dataPath);
    if (!exists) {
      record('Database Persistence', false, 'fleetdash.json does not exist on disk');
    } else {
      const stats = fs.statSync(dataPath);
      const raw = fs.readFileSync(dataPath, 'utf-8');
      const json = JSON.parse(raw);
      const valid = Array.isArray(json.vehicles) && Array.isArray(json.geofences) && Array.isArray(json.alerts);
      record('Database Persistence', valid && stats.size > 1000, `File size: ${stats.size} bytes, Vehicles in DB: ${json.vehicles.length}, Geofences: ${json.geofences.length}`);
    }
  } catch (err: any) {
    record('Database Persistence', false, err.message);
  }

  console.log('\n========================================================');
  console.log(` VERIFICATION COMPLETE: ${results.filter(r => r.status === 'PASSED').length}/${results.length} PASSED`);
  console.log('========================================================');
}

void runVerification();

