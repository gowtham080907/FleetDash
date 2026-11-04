import { config } from '../../config/env';
import { MessageBroker } from './broker.types';
import { MemoryBroker } from './memoryBroker';
import { RedisBroker } from './redisBroker';

export * from './broker.types';
export * from './memoryBroker';
export * from './redisBroker';

let activeBroker: MessageBroker | null = null;

export async function initBroker(): Promise<MessageBroker> {
  if (activeBroker && activeBroker.isHealthy()) {
    return activeBroker;
  }

  const requestedMode = config.BROKER_MODE;

  if (requestedMode === 'redis' && config.REDIS_ENABLED) {
    console.log(`[BrokerFactory] Attempting connection to Redis broker at ${config.REDIS_URL}...`);
    const redisBroker = new RedisBroker({
      url: config.REDIS_URL,
      connectTimeoutMs: config.REDIS_CONNECT_TIMEOUT_MS,
    });

    try {
      await redisBroker.connect();
      console.log('[BrokerFactory] Successfully initialized Redis Pub/Sub message broker.');
      activeBroker = redisBroker;
      return activeBroker;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (config.REDIS_REQUIRED) {
        console.error(`[BrokerFactory] REDIS_REQUIRED=true and Redis failed to connect: ${errMsg}`);
        throw new Error(`Failed to initialize required Redis broker: ${errMsg}`);
      }

      console.warn(
        `[BrokerFactory] WARNING: Redis unreachable (${errMsg}). Falling back to in-memory MessageBroker.`
      );
      const memoryBroker = new MemoryBroker();
      await memoryBroker.connect();
      activeBroker = memoryBroker;
      return activeBroker;
    }
  }

  console.log('[BrokerFactory] Initializing in-memory MessageBroker (BROKER_MODE=memory or REDIS_ENABLED=false)...');
  const memoryBroker = new MemoryBroker();
  await memoryBroker.connect();
  activeBroker = memoryBroker;
  return activeBroker;
}

export function getBroker(): MessageBroker {
  if (!activeBroker) {
    activeBroker = new MemoryBroker();
    void activeBroker.connect();
  }
  return activeBroker;
}

export function setBroker(broker: MessageBroker): void {
  activeBroker = broker;
}
