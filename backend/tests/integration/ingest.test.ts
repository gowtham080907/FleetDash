import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import http from 'http';
import { AddressInfo } from 'net';
import { io as ioClient, Socket } from 'socket.io-client';
import { app } from '../../src/app';
import { workerPool } from '../../src/services/workerPool.service';
import { MemoryBroker } from '../../src/services/broker/memoryBroker';
import { setBroker } from '../../src/services/broker';
import { initSocketServer, SocketServerInstance } from '../../src/socket/socketServer';
import { decodeTelemetryBatch } from '../../src/workers/binaryEncoder';
import { pipelineStats } from '../../src/services/pipelineStats.service';
import { config } from '../../src/config/env';

describe('POST /api/telemetry/ingest Integration & Socket Streaming Tests', () => {
  let server: http.Server;
  let socketInstance: SocketServerInstance;
  let broker: MemoryBroker;
  let serverPort: number;

  beforeAll(async () => {
    // 1. Initialize worker pool
    await workerPool.init();

    // 2. Setup in-memory broker
    broker = new MemoryBroker();
    await broker.connect();
    setBroker(broker);

    // 3. Bind HTTP server and Socket.IO to an ephemeral random port
    server = http.createServer(app);
    socketInstance = initSocketServer(server, broker);

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        serverPort = (server.address() as AddressInfo).port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await socketInstance.shutdown();
    await broker.disconnect();
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
    await workerPool.shutdown();
  });

  it('ingests a valid batch and broadcasts binary telemetry frame to connected client', async () => {
    // Connect test Socket.IO client
    const client: Socket = ioClient(`http://localhost:${serverPort}`, {
      path: '/socket.io',
      transports: ['websocket'],
    });

    await new Promise<void>((resolve) => {
      client.on('connect', () => resolve());
    });

    const receivedFrames: Buffer[] = [];
    client.on('telemetry:batch', (payload: ArrayBuffer | Buffer) => {
      receivedFrames.push(Buffer.from(payload));
    });

    const validPoint = {
      vehicleId: 'VH-1001',
      latitude: 17.385045,
      longitude: 78.486671,
      speed: 68.4,
      heading: 182.5,
      timestamp: 1704067200000,
      status: 'active',
      geofenceStatus: 'inside',
    };

    // Dispatch ingest HTTP request
    const res = await request(app)
      .post('/api/telemetry/ingest')
      .send({ points: [validPoint] });

    expect(res.status).toBe(202);
    expect(res.body.success).toBe(true);
    expect(res.body.accepted).toBe(1);
    expect(res.body.published).toBe(1);
    expect(res.body.rejected).toEqual([]);
    expect(res.body.requestId).toBeDefined();

    // Force flush on broadcaster to emit without waiting for interval
    socketInstance.broadcaster.flush();

    // Allow socket dispatch
    await new Promise((r) => setTimeout(r, 80));

    expect(receivedFrames.length).toBeGreaterThanOrEqual(1);
    const decoded = decodeTelemetryBatch(receivedFrames[0]!);
    expect(decoded.records.length).toBe(1);
    expect(decoded.records[0]!.vehicleId).toBe('VH-1001');
    expect(decoded.records[0]!.latitude).toBeCloseTo(17.385045, 5);
    expect(decoded.records[0]!.speed).toBe(68.4);

    client.disconnect();
  });

  it('isolates invalid records in mixed batch and returns 202 with rejected array', async () => {
    const mixedBatch = [
      { vehicleId: 'V1', latitude: 17.385, longitude: 78.486, speed: 40 },
      { vehicleId: 'V2', latitude: 999.0, longitude: 78.486, speed: 40 }, // Bad lat
    ];

    const res = await request(app)
      .post('/api/telemetry/ingest')
      .send({ points: mixedBatch });

    expect(res.status).toBe(202);
    expect(res.body.success).toBe(true);
    expect(res.body.accepted).toBe(1);
    expect(res.body.published).toBe(1);
    expect(res.body.rejected.length).toBe(1);
    expect(res.body.rejected[0]!.index).toBe(1);
    expect(res.body.rejected[0]!.reason).toMatch(/latitude/i);
  });

  it('rejects malformed requests with proper 400 errors', async () => {
    // Missing points field
    const res1 = await request(app)
      .post('/api/telemetry/ingest')
      .send({});
    expect(res1.status).toBe(400);
    expect(res1.body.error.code).toBe('MISSING_POINTS_FIELD');

    // Empty batch
    const res2 = await request(app)
      .post('/api/telemetry/ingest')
      .send({ points: [] });
    expect(res2.status).toBe(400);
    expect(res2.body.error.code).toBe('EMPTY_BATCH');

    // Points not array
    const res3 = await request(app)
      .post('/api/telemetry/ingest')
      .send({ points: 'not-an-array' });
    expect(res3.status).toBe(400);
    expect(res3.body.error.code).toBe('POINTS_NOT_ARRAY');
  });

  it('rejects batches exceeding MAX_BATCH_SIZE with HTTP 413', async () => {
    const hugeBatch = new Array(config.MAX_BATCH_SIZE + 1).fill({
      vehicleId: 'V1',
      latitude: 10,
      longitude: 20,
    });

    const res = await request(app)
      .post('/api/telemetry/ingest')
      .send({ points: hugeBatch });

    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('BATCH_TOO_LARGE');
  });

  it('returns 503 INGESTION_QUEUE_FULL under queue backpressure limit', async () => {
    // Temporarily saturate in-flight counter
    pipelineStats.incrementInFlight(config.INGEST_MAX_QUEUE);

    const res = await request(app)
      .post('/api/telemetry/ingest')
      .send({ points: [{ vehicleId: 'V1', latitude: 10, longitude: 20 }] });

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('INGESTION_QUEUE_FULL');

    // Restore in-flight count
    pipelineStats.decrementInFlight(config.INGEST_MAX_QUEUE);
  });

  it('broadcasts binary frames to multiple connected clients simultaneously', async () => {
    const client1: Socket = ioClient(`http://localhost:${serverPort}`, {
      path: '/socket.io',
      transports: ['websocket'],
    });
    const client2: Socket = ioClient(`http://localhost:${serverPort}`, {
      path: '/socket.io',
      transports: ['websocket'],
    });

    await Promise.all([
      new Promise<void>((r) => client1.on('connect', () => r())),
      new Promise<void>((r) => client2.on('connect', () => r())),
    ]);

    let count1 = 0;
    let count2 = 0;
    client1.on('telemetry:batch', () => { count1++; });
    client2.on('telemetry:batch', () => { count2++; });

    await request(app)
      .post('/api/telemetry/ingest')
      .send({ points: [{ vehicleId: 'VH-999', latitude: 12.5, longitude: 77.5 }] });

    socketInstance.broadcaster.flush();
    await new Promise((r) => setTimeout(r, 80));

    expect(count1).toBeGreaterThanOrEqual(1);
    expect(count2).toBeGreaterThanOrEqual(1);

    client1.disconnect();
    client2.disconnect();
  });

  it('exposes accurate counters on GET /api/telemetry/pipeline-stats', async () => {
    const res = await request(app).get('/api/telemetry/pipeline-stats');

    expect(res.status).toBe(200);
    expect(typeof res.body.received).toBe('number');
    expect(typeof res.body.accepted).toBe('number');
    expect(typeof res.body.published).toBe('number');
    expect(typeof res.body.eventsPerSecond).toBe('number');
    expect(res.body.broker).toHaveProperty('type', 'memory');
    expect(res.body.broker).toHaveProperty('healthy', true);
  });
});
