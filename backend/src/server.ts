import http from 'http';
import { app } from './app';
import { config } from './config/env';
import { workerPool } from './services/workerPool.service';
import { initBroker, getBroker } from './services/broker';
import { initSocketServer, getSocketServer } from './socket/socketServer';

let server: http.Server | null = null;
let isShuttingDown = false;

async function startServer(): Promise<void> {
  try {
    // 1. Initialize worker pool before serving requests
    console.log(`[WorkerPool] Initializing ${config.WORKER_POOL_SIZE} worker thread(s)...`);
    await workerPool.init();
    const status = workerPool.getStatus();
    console.log(`[WorkerPool] Ready: ${status.activeWorkers}/${status.poolSize} worker(s) active.`);

    // 2. Initialize Message Broker (Redis Pub/Sub with automatic MemoryBroker fallback)
    console.log(`[Broker] Initializing message broker (mode: ${config.BROKER_MODE})...`);
    const broker = await initBroker();
    console.log(`[Broker] Active broker type: ${broker.getBrokerType()} (healthy: ${broker.isHealthy()})`);

    // 3. Create HTTP server instance
    server = http.createServer(app);

    // 4. Attach Socket.IO server for binary telemetry streaming
    const socketInstance = initSocketServer(server, broker);
    console.log(`[Socket.IO] Attached to HTTP server at path ${config.SOCKET_PATH}`);

    // 5. Start listening
    server.listen(config.PORT, () => {
      console.log('----------------------------------------------------');
      console.log(`  FleetDash Backend Service running`);
      console.log(`  Environment: ${config.NODE_ENV}`);
      console.log(`  Port:        ${config.PORT}`);
      console.log(`  Health:      http://localhost:${config.PORT}/api/health`);
      console.log(`  Process:     http://localhost:${config.PORT}/api/telemetry/process-batch`);
      console.log(`  Ingest:      http://localhost:${config.PORT}/api/telemetry/ingest`);
      console.log(`  Stats:       http://localhost:${config.PORT}/api/telemetry/pipeline-stats`);
      console.log(`  Socket.IO:   ws://localhost:${config.PORT}${config.SOCKET_PATH}`);
      console.log(`  Broker:      ${broker.getBrokerType().toUpperCase()}`);
      console.log(`  CORS:        ${config.CORS_ORIGINS.join(', ')}`);
      console.log('----------------------------------------------------');
    });

    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`[Server] Error: Port ${config.PORT} is already in use.`);
      } else {
        console.error('[Server] Server error:', err);
      }
      process.exit(1);
    });
  } catch (err) {
    console.error('[Server] Fatal startup error:', err);
    process.exit(1);
  }
}

async function gracefulShutdown(signal: string): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\n[Server] Received ${signal}. Commencing graceful shutdown...`);

  // Force termination fallback if cleanup hangs
  const forceExitTimeout = setTimeout(() => {
    console.error('[Server] Graceful shutdown timed out. Forcing process exit.');
    process.exit(1);
  }, 10000);
  forceExitTimeout.unref();

  try {
    // 1. Stop accepting new HTTP connections
    if (server) {
      await new Promise<void>((resolve) => {
        server?.close((err) => {
          if (err) {
            console.error('[Server] Error while closing HTTP server:', err);
          } else {
            console.log('[Server] HTTP server stopped accepting connections.');
          }
          resolve();
        });
      });
    }

    // 2. Close Socket.IO server & flush broadcaster
    const socketServer = getSocketServer();
    if (socketServer) {
      console.log('[Socket.IO] Closing Socket.IO connections and flushing broadcaster...');
      await socketServer.shutdown();
      console.log('[Socket.IO] Socket.IO shutdown complete.');
    }

    // 3. Disconnect message broker
    const broker = getBroker();
    console.log('[Broker] Disconnecting message broker...');
    await broker.disconnect();
    console.log('[Broker] Message broker disconnected.');

    // 4. Terminate worker threads cleanly
    console.log('[WorkerPool] Terminating worker threads...');
    await workerPool.shutdown();
    console.log('[WorkerPool] Worker pool shutdown complete.');

    clearTimeout(forceExitTimeout);
    console.log('[Server] Graceful shutdown successful. Exiting.');
    process.exit(0);
  } catch (err) {
    console.error('[Server] Error during graceful shutdown:', err);
    process.exit(1);
  }
}

// Register termination signals
process.on('SIGINT', () => {
  void gracefulShutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void gracefulShutdown('SIGTERM');
});

// Windows console break event
process.on('SIGBREAK', () => {
  void gracefulShutdown('SIGBREAK');
});

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (err) => {
  console.error('[Server] Uncaught Exception:', err);
  void gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  console.error('[Server] Unhandled Rejection:', reason);
  void gracefulShutdown('unhandledRejection');
});

void startServer();
