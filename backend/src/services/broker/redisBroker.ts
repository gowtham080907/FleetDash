import Redis, { RedisOptions } from 'ioredis';
import { MessageBroker, MessageHandler } from './broker.types';

export function sanitizeRedisUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.password || parsed.username) {
      parsed.username = parsed.username ? '***' : '';
      parsed.password = parsed.password ? '***' : '';
    }
    return parsed.toString();
  } catch {
    return url.replace(/\/\/[^@]+@/, '//***@');
  }
}

export interface RedisBrokerOptions {
  url?: string;
  connectTimeoutMs?: number;
}

export class RedisBroker implements MessageBroker {
  private publisher: Redis;
  private subscriber: Redis;
  private handlers: Map<string, Set<MessageHandler>> = new Map();
  private connected = false;
  private connectTimeoutMs: number;
  private sanitizedUrl: string;

  constructor(options: RedisBrokerOptions = {}) {
    const redisUrl = options.url || 'redis://localhost:6379';
    this.connectTimeoutMs = options.connectTimeoutMs || 3000;
    this.sanitizedUrl = sanitizeRedisUrl(redisUrl);

    const redisOptions: RedisOptions = {
      lazyConnect: true,
      connectTimeout: this.connectTimeoutMs,
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      retryStrategy: (times) => {
        if (!this.connected) {
          // Do not retry indefinitely if initial connect failed
          return null;
        }
        const delay = Math.min(times * 150, 3000);
        return delay;
      },
    };

    // Dedicated publisher connection
    this.publisher = new Redis(redisUrl, {
      ...redisOptions,
      connectionName: 'fleetdash-publisher',
    });

    // Dedicated subscriber connection (RESP2 requires dedicated connection for pub/sub)
    this.subscriber = new Redis(redisUrl, {
      ...redisOptions,
      connectionName: 'fleetdash-subscriber',
    });

    this.setupListeners();
  }

  private setupListeners(): void {
    // Publisher logging and error suppression
    this.publisher.on('connect', () => {
      console.log(`[RedisBroker:Publisher] Socket connected to ${this.sanitizedUrl}`);
    });
    this.publisher.on('ready', () => {
      console.log('[RedisBroker:Publisher] Ready to publish commands');
    });
    this.publisher.on('reconnecting', (delay: number) => {
      console.warn(`[RedisBroker:Publisher] Reconnecting in ${delay}ms...`);
    });
    this.publisher.on('error', (err) => {
      console.error('[RedisBroker:Publisher] Redis error:', err.message);
    });

    // Subscriber logging, error suppression, and binary payload dispatch
    this.subscriber.on('connect', () => {
      console.log(`[RedisBroker:Subscriber] Socket connected to ${this.sanitizedUrl}`);
    });
    this.subscriber.on('ready', () => {
      console.log('[RedisBroker:Subscriber] Ready to receive subscriptions');
    });
    this.subscriber.on('reconnecting', (delay: number) => {
      console.warn(`[RedisBroker:Subscriber] Reconnecting in ${delay}ms...`);
    });
    this.subscriber.on('error', (err) => {
      console.error('[RedisBroker:Subscriber] Redis error:', err.message);
    });

    // Use messageBuffer to receive raw binary Buffer without UTF-8 string conversion
    this.subscriber.on('messageBuffer', (channelBuffer: Buffer, messageBuffer: Buffer) => {
      const channel = channelBuffer.toString('utf8');
      const channelHandlers = this.handlers.get(channel);

      if (channelHandlers && channelHandlers.size > 0) {
        for (const handler of channelHandlers) {
          try {
            handler(channel, messageBuffer);
          } catch (err) {
            console.error(`[RedisBroker] Error in message handler for channel "${channel}":`, err);
          }
        }
      }
    });
  }

  public async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    const connectWithTimeout = async (client: Redis, name: string): Promise<void> => {
      let timeoutId: NodeJS.Timeout;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          client.disconnect(false);
          reject(new Error(`Redis ${name} connect timeout after ${this.connectTimeoutMs}ms (${this.sanitizedUrl})`));
        }, this.connectTimeoutMs);
      });

      try {
        await Promise.race([client.connect(), timeoutPromise]);
      } finally {
        // @ts-expect-error timeoutId is assigned in Promise executor
        clearTimeout(timeoutId);
      }
    };

    try {
      await Promise.all([
        connectWithTimeout(this.publisher, 'publisher'),
        connectWithTimeout(this.subscriber, 'subscriber'),
      ]);
      this.connected = true;
    } catch (err) {
      this.connected = false;
      try {
        this.publisher.disconnect(false);
        this.subscriber.disconnect(false);
      } catch {
        // Ignore disconnect errors on failed connect
      }
      throw err;
    }
  }

  public async publish(channel: string, data: Buffer | string): Promise<number> {
    if (!this.isHealthy()) {
      throw new Error('RedisBroker is not connected or ready');
    }

    const payload = Buffer.isBuffer(data) ? data : Buffer.from(data);
    return await this.publisher.publish(channel, payload);
  }

  public async subscribe(channel: string, handler: MessageHandler): Promise<void> {
    const isFirstHandler = !this.handlers.has(channel) || this.handlers.get(channel)!.size === 0;

    if (!this.handlers.has(channel)) {
      this.handlers.set(channel, new Set());
    }
    this.handlers.get(channel)!.add(handler);

    if (isFirstHandler && this.isHealthy()) {
      await this.subscriber.subscribe(channel);
    }
  }

  public async unsubscribe(channel: string): Promise<void> {
    this.handlers.delete(channel);
    if (this.isHealthy()) {
      try {
        await this.subscriber.unsubscribe(channel);
      } catch (err) {
        console.warn(`[RedisBroker] Failed to unsubscribe from channel "${channel}":`, err);
      }
    }
  }

  public isHealthy(): boolean {
    return (
      this.connected &&
      this.publisher.status === 'ready' &&
      this.subscriber.status === 'ready'
    );
  }

  public async disconnect(): Promise<void> {
    this.connected = false;
    this.handlers.clear();

    const quitClient = async (client: Redis): Promise<void> => {
      try {
        if (client.status === 'ready' || client.status === 'connecting' || client.status === 'connect') {
          await client.quit();
        } else {
          client.disconnect(false);
        }
      } catch {
        client.disconnect(false);
      }
    };

    await Promise.allSettled([
      quitClient(this.publisher),
      quitClient(this.subscriber),
    ]);
  }

  public getBrokerType(): 'redis' {
    return 'redis';
  }
}
