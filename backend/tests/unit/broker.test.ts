import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MemoryBroker } from '../../src/services/broker/memoryBroker';
import { RedisBroker, sanitizeRedisUrl } from '../../src/services/broker/redisBroker';
import Redis from 'ioredis';

describe('MessageBroker Unit & Integration Tests', () => {
  describe('MemoryBroker', () => {
    it('manages lifecycle, subscriptions, and preserves binary Buffer integrity', async () => {
      const broker = new MemoryBroker();
      expect(broker.isHealthy()).toBe(false);

      await broker.connect();
      expect(broker.isHealthy()).toBe(true);
      expect(broker.getBrokerType()).toBe('memory');

      const received: Buffer[] = [];
      await broker.subscribe('test:channel', (_ch, data) => {
        received.push(data);
      });

      // Send raw binary buffer containing 0xCA, 0xFE, 0xBA, 0xBE
      const testBuffer = Buffer.from([0xCA, 0xFE, 0xBA, 0xBE]);
      const subscriberCount = await broker.publish('test:channel', testBuffer);
      expect(subscriberCount).toBe(1);

      expect(received.length).toBe(1);
      expect(Buffer.isBuffer(received[0])).toBe(true);
      expect(received[0]![0]).toBe(0xCA);
      expect(received[0]![1]).toBe(0xFE);
      expect(received[0]![2]).toBe(0xBA);
      expect(received[0]![3]).toBe(0xBE);

      // Unsubscribe check
      await broker.unsubscribe('test:channel');
      await broker.publish('test:channel', testBuffer);
      expect(received.length).toBe(1); // No new messages

      // Idempotent disconnect
      await broker.disconnect();
      expect(broker.isHealthy()).toBe(false);
      await broker.disconnect();
    });
  });

  describe('RedisBroker URL Sanitization', () => {
    it('masks passwords in Redis connection URLs without leaking credentials', () => {
      const rawUrl = 'redis://fleet_user:secret_password_123@redis.prod.internal:6379/0';
      const sanitized = sanitizeRedisUrl(rawUrl);

      expect(sanitized).not.toContain('secret_password_123');
      expect(sanitized).toContain('redis://');
      expect(sanitized).toContain('redis.prod.internal:6379');
    });
  });

  describe('RedisBroker Real Integration (Skipped if Redis unreachable)', () => {
    let isRedisAvailable = false;
    let testRedis: Redis | null = null;

    beforeAll(async () => {
      try {
        testRedis = new Redis('redis://localhost:6379', {
          connectTimeout: 500,
          maxRetriesPerRequest: 0,
          lazyConnect: true,
          retryStrategy: () => null,
        });
        testRedis.on('error', () => {
          // Suppress unhandled error log when Redis is offline during integration probe
        });

        const connectPromise = testRedis.connect();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout probing Redis on localhost:6379')), 600)
        );

        await Promise.race([connectPromise, timeoutPromise]);
        await testRedis.ping();
        isRedisAvailable = true;
      } catch {
        isRedisAvailable = false;
      }
    });

    afterAll(async () => {
      if (testRedis) {
        testRedis.disconnect(false);
      }
    });

    it('publishes and subscribes binary buffers over real Redis', async (ctx) => {
      if (!isRedisAvailable) {
        ctx.skip();
        return;
      }

      const broker = new RedisBroker({
        url: 'redis://localhost:6379',
        connectTimeoutMs: 1500,
      });

      await broker.connect();
      expect(broker.isHealthy()).toBe(true);
      expect(broker.getBrokerType()).toBe('redis');

      const received: Buffer[] = [];
      const testChannel = `test:redis:${Date.now()}`;

      await broker.subscribe(testChannel, (_ch, data) => {
        received.push(data);
      });

      // Allow subscription to establish in Redis
      await new Promise((r) => setTimeout(r, 100));

      const payload = Buffer.from([0xFD, 0x01, 0xAA, 0xBB]);
      await broker.publish(testChannel, payload);

      // Wait for dispatch over TCP socket
      await new Promise((r) => setTimeout(r, 200));

      expect(received.length).toBeGreaterThanOrEqual(1);
      expect(Buffer.isBuffer(received[0])).toBe(true);
      expect(received[0]![0]).toBe(0xFD);
      expect(received[0]![1]).toBe(0x01);

      await broker.unsubscribe(testChannel);
      await broker.disconnect();
    });
  });
});
