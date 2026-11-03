import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from backend/.env if present
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

function parseNumber(value: string | undefined, defaultValue: number, min?: number, max?: number): number {
  if (value === undefined || value.trim() === '') {
    return defaultValue;
  }
  const parsed = Number(value);
  if (Number.isNaN(parsed) || !Number.isFinite(parsed)) {
    return defaultValue;
  }
  if (min !== undefined && parsed < min) {
    return defaultValue;
  }
  if (max !== undefined && parsed > max) {
    return defaultValue;
  }
  return parsed;
}

function parseCorsOrigins(value: string | undefined): string[] {
  if (!value || value.trim() === '') {
    return ['http://localhost:5173', 'http://127.0.0.1:5173'];
  }
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined || value.trim() === '') {
    return defaultValue;
  }
  const normalized = value.trim().toLowerCase();
  return normalized === 'true' || normalized === '1';
}

function parseBrokerMode(value: string | undefined, defaultValue: 'redis' | 'memory'): 'redis' | 'memory' {
  if (!value || value.trim() === '') {
    return defaultValue;
  }
  return value.trim().toLowerCase() === 'memory' ? 'memory' : 'redis';
}

export interface AppConfig {
  PORT: number;
  NODE_ENV: 'development' | 'production' | 'test';
  CORS_ORIGINS: string[];
  WORKER_POOL_SIZE: number;
  WORKER_TASK_TIMEOUT_MS: number;
  MAX_BATCH_SIZE: number;
  JSON_BODY_LIMIT: string;
  WORKER_QUEUE_MAX_SIZE: number;

  // Week 2 Redis Pub/Sub & Broker
  REDIS_URL: string;
  REDIS_ENABLED: boolean;
  REDIS_REQUIRED: boolean;
  REDIS_CHANNEL_TELEMETRY: string;
  REDIS_CONNECT_TIMEOUT_MS: number;
  BROKER_MODE: 'redis' | 'memory';

  // Week 2 Socket.IO & Transport
  SOCKET_PATH: string;
  SOCKET_BATCH_INTERVAL_MS: number;
  SOCKET_MAX_BATCH_RECORDS: number;
  SOCKET_PING_INTERVAL_MS: number;
  SOCKET_PING_TIMEOUT_MS: number;
  INGEST_MAX_QUEUE: number;

  // JWT & Security
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  DATA_DIR: string;
}

const nodeEnv = process.env.NODE_ENV === 'production'
  ? 'production'
  : process.env.NODE_ENV === 'test'
    ? 'test'
    : 'development';

export const config: AppConfig = {
  PORT: parseNumber(process.env.PORT, 5000, 1, 65535),
  NODE_ENV: nodeEnv,
  CORS_ORIGINS: parseCorsOrigins(process.env.CORS_ORIGINS),
  WORKER_POOL_SIZE: parseNumber(process.env.WORKER_POOL_SIZE, 2, 1, 16),
  WORKER_TASK_TIMEOUT_MS: parseNumber(process.env.WORKER_TASK_TIMEOUT_MS, 5000, 100, 60000),
  MAX_BATCH_SIZE: parseNumber(process.env.MAX_BATCH_SIZE, 10000, 1, 100000),
  JSON_BODY_LIMIT: process.env.JSON_BODY_LIMIT?.trim() || '1mb',
  WORKER_QUEUE_MAX_SIZE: parseNumber(process.env.WORKER_QUEUE_MAX_SIZE, 500, 10, 5000),

  // Week 2 Redis & Broker
  REDIS_URL: process.env.REDIS_URL?.trim() || 'redis://localhost:6379',
  REDIS_ENABLED: parseBoolean(process.env.REDIS_ENABLED, true),
  REDIS_REQUIRED: parseBoolean(process.env.REDIS_REQUIRED, false),
  REDIS_CHANNEL_TELEMETRY: process.env.REDIS_CHANNEL_TELEMETRY?.trim() || 'fleetdash:telemetry',
  REDIS_CONNECT_TIMEOUT_MS: parseNumber(process.env.REDIS_CONNECT_TIMEOUT_MS, 3000, 100, 60000),
  BROKER_MODE: parseBrokerMode(process.env.BROKER_MODE, 'redis'),

  // Week 2 Socket.IO & Transport
  SOCKET_PATH: process.env.SOCKET_PATH?.trim() || '/socket.io',
  SOCKET_BATCH_INTERVAL_MS: parseNumber(process.env.SOCKET_BATCH_INTERVAL_MS, 50, 1, 5000),
  SOCKET_MAX_BATCH_RECORDS: parseNumber(process.env.SOCKET_MAX_BATCH_RECORDS, 500, 1, 10000),
  SOCKET_PING_INTERVAL_MS: parseNumber(process.env.SOCKET_PING_INTERVAL_MS, 25000, 1000, 120000),
  SOCKET_PING_TIMEOUT_MS: parseNumber(process.env.SOCKET_PING_TIMEOUT_MS, 20000, 1000, 120000),
  INGEST_MAX_QUEUE: parseNumber(process.env.INGEST_MAX_QUEUE, 10000, 10, 100000),

  // JWT & Security
  JWT_SECRET: process.env.JWT_SECRET?.trim() || 'fleetdash-super-secure-production-jwt-token-key-2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN?.trim() || '24h',
  DATA_DIR: process.env.DATA_DIR?.trim() || path.resolve(process.cwd(), 'data'),
};
