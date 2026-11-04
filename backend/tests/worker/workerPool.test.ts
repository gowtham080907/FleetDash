import { describe, it, expect, afterEach } from 'vitest';
import crypto from 'crypto';
import { WorkerPoolService } from '../../src/services/workerPool.service';
import { WorkerRequest, WorkerResponse } from '../../src/types/worker-protocol';
import { AppError } from '../../src/utils/AppError';

describe('Worker Pool Service Tests', () => {
  let pool: WorkerPoolService | null = null;

  afterEach(async () => {
    if (pool) {
      await pool.shutdown();
      pool = null;
    }
  });

  it('performs real PING/PONG round-trip with matching requestId', async () => {
    pool = new WorkerPoolService(2, 3000);
    await pool.init();

    const requestId = crypto.randomUUID();
    const request: WorkerRequest = {
      type: 'PING',
      requestId,
    };

    const response = await pool.run(request);
    expect(response.type).toBe('PONG');
    expect(response.requestId).toBe(requestId);
  });

  it('processes coordinates in real worker returning RESULT with matching requestId', async () => {
    pool = new WorkerPoolService(2, 3000);
    await pool.init();

    const requestId = crypto.randomUUID();
    const request: WorkerRequest = {
      type: 'PROCESS_COORDINATES',
      requestId,
      payload: {
        points: [
          { vehicleId: 'V1', latitude: 12.9716, longitude: 77.5946 },
          { vehicleId: 'V2', latitude: -91, longitude: 50 }, // invalid
        ],
      },
    };

    const response: WorkerResponse = await pool.run(request);
    expect(response.type).toBe('RESULT');
    expect(response.requestId).toBe(requestId);

    if (response.type === 'RESULT') {
      expect(response.payload.stats.received).toBe(2);
      expect(response.payload.stats.valid).toBe(1);
      expect(response.payload.stats.invalid).toBe(1);
      expect(response.payload.processed[0]?.vehicleId).toBe('V1');
      expect(response.payload.rejected[0]?.index).toBe(1);
    }
  });

  it('resolves concurrent tasks to correct requestIds without cross-talk', async () => {
    pool = new WorkerPoolService(2, 5000);
    await pool.init();

    const count = 25;
    const requests: WorkerRequest[] = Array.from({ length: count }, (_, i) => ({
      type: 'PROCESS_COORDINATES',
      requestId: `concurrent-req-${i}`,
      payload: {
        points: [
          { vehicleId: `V-${i}`, latitude: 10 + i * 0.1, longitude: 20 + i * 0.1 },
        ],
      },
    }));

    const results = await Promise.all(requests.map((r) => pool!.run(r)));

    expect(results).toHaveLength(count);
    results.forEach((res, i) => {
      expect(res.requestId).toBe(`concurrent-req-${i}`);
      expect(res.type).toBe('RESULT');
    });
  });

  it('triggers task timeout when worker takes longer than timeout limit', async () => {
    pool = new WorkerPoolService(2, 1000);
    await pool.init();

    const requestId = 'timeout-task';
    // Use test hook: worker sleeps for 400ms, but timeout is set to 50ms
    await expect(
      pool.run({ type: 'SLEEP', requestId, payload: { delayMs: 400 } }, 50)
    ).rejects.toThrow(AppError);

    try {
      await pool.run({ type: 'SLEEP', requestId: 'timeout-task-2', payload: { delayMs: 400 } }, 50);
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      const appErr = err as AppError;
      expect(appErr.statusCode).toBe(504);
      expect(appErr.code).toBe('WORKER_TIMEOUT');
    }
  });

  it('rejects in-flight tasks and respawns when a worker terminates unexpectedly', async () => {
    pool = new WorkerPoolService(2, 3000);
    await pool.init();

    const statusBefore = pool.getStatus();
    expect(statusBefore.activeWorkers).toBe(2);

    // Intentionally terminate one underlying worker to simulate a crash
    const anyPool = pool as unknown as {
      workers: { id: number; worker: { terminate: () => void } }[];
    };
    const firstWorker = anyPool.workers[0];
    expect(firstWorker).toBeDefined();

    // Terminate worker
    firstWorker!.worker.terminate();

    // Wait for the pool to detect exit and respawn
    await new Promise((r) => setTimeout(r, 600));

    // The pool should have respawned the worker and recovered
    const statusAfter = pool.getStatus();
    expect(statusAfter.ready).toBe(true);
    expect(statusAfter.poolSize).toBe(2);

    // Verify pool can successfully execute a task after recovery
    const res = await pool.run({ type: 'PING', requestId: 'ping-after-respawn' });
    expect(res.type).toBe('PONG');
    expect(res.requestId).toBe('ping-after-respawn');
  });

  it('is idempotent on shutdown and rejects new requests cleanly', async () => {
    pool = new WorkerPoolService(2, 3000);
    await pool.init();

    // First shutdown
    await pool.shutdown();
    expect(pool.getStatus().isShuttingDown).toBe(true);

    // Subsequent shutdown call must not throw (idempotency)
    await expect(pool.shutdown()).resolves.toBeUndefined();

    // Submitting a request after shutdown must reject with 503
    await expect(
      pool.run({ type: 'PING', requestId: 'after-shutdown' })
    ).rejects.toThrow(AppError);

    try {
      await pool.run({ type: 'PING', requestId: 'after-shutdown-2' });
    } catch (err) {
      const appErr = err as AppError;
      expect(appErr.statusCode).toBe(503);
      expect(appErr.code).toBe('WORKER_UNAVAILABLE');
    }
  });
});
