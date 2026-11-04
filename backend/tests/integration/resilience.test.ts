import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';
import { workerPool } from '../../src/services/workerPool.service';
import { initBroker, getBroker, setBroker } from '../../src/services/broker';
import { MemoryBroker } from '../../src/services/broker/memoryBroker';
import { RedisBroker } from '../../src/services/broker/redisBroker';

describe('System Resilience & Recovery Integration Tests', () => {
  beforeAll(async () => {
    await workerPool.init();
    const memoryBroker = new MemoryBroker();
    await memoryBroker.connect();
    setBroker(memoryBroker);
  });

  afterAll(async () => {
    await workerPool.shutdown();
  });

  it('falls back to MemoryBroker when Redis is unreachable at startup without throwing or crashing', async () => {
    // Attempt connecting to a non-existent Redis port
    const broker = new RedisBroker({
      url: 'redis://127.0.0.1:59999',
      connectTimeoutMs: 300,
    });

    let connectError: Error | null = null;
    try {
      await broker.connect();
    } catch (err) {
      connectError = err as Error;
    }

    expect(connectError).not.toBeNull();
    expect(broker.isHealthy()).toBe(false);

    // Factory fallback mechanism
    const activeBroker = await initBroker();
    expect(activeBroker.isHealthy()).toBe(true);
    expect(activeBroker.getBrokerType()).toBe('memory');
  });

  it('broker error event does not crash or throw uncaught exception', async () => {
    const broker = new RedisBroker({
      url: 'redis://127.0.0.1:59999',
      connectTimeoutMs: 200,
    });

    // Emitting error should not throw uncaught error because listeners are attached
    expect(() => {
      // @ts-expect-error accessing private property for resilience test
      broker.publisher.emit('error', new Error('Simulated network blip'));
      // @ts-expect-error accessing private property for resilience test
      broker.subscriber.emit('error', new Error('Simulated subscriber disconnect'));
    }).not.toThrow();

    await broker.disconnect();
  });

  it('handles server health check even if broker is degraded', async () => {
    const degradedBroker = new MemoryBroker();
    // Not calling connect() -> unhealthy
    setBroker(degradedBroker);

    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.broker.healthy).toBe(false);

    // Restore healthy broker
    await degradedBroker.connect();
    setBroker(degradedBroker);
  });
});
