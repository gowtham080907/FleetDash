import http from 'http';
import { Server, ServerOptions } from 'socket.io';
import { config } from '../config/env';
import { MessageBroker } from '../services/broker/broker.types';
import { broadcaster, TelemetryBroadcaster } from './broadcaster';
import { pipelineStats } from '../services/pipelineStats.service';
import { encodeTelemetryBatch } from '../workers/binaryEncoder';

export interface SocketServerInstance {
  io: Server;
  broadcaster: TelemetryBroadcaster;
  shutdown: () => Promise<void>;
}

let activeSocketServer: SocketServerInstance | null = null;

export function initSocketServer(
  httpServer: http.Server,
  broker: MessageBroker
): SocketServerInstance {
  if (activeSocketServer) {
    return activeSocketServer;
  }

  const serverOptions: Partial<ServerOptions> = {
    path: config.SOCKET_PATH,
    transports: ['websocket', 'polling'],
    pingInterval: config.SOCKET_PING_INTERVAL_MS,
    pingTimeout: config.SOCKET_PING_TIMEOUT_MS,
    cors: {
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, test clients, server-to-server)
        if (!origin) {
          return callback(null, true);
        }
        if (config.CORS_ORIGINS.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error('CORS origin not allowed by FleetDash Socket.IO policy'), false);
      },
      credentials: true,
      methods: ['GET', 'POST'],
    },
    serveClient: false,
  };

  const io = new Server(httpServer, serverOptions);

  io.on('connection', (socket) => {
    const clientCount = io.engine.clientsCount;
    console.log(`[Socket.IO] Client connected. Total active clients: ${clientCount}`);

    // Send latest vehicle snapshot if any states exist
    try {
      const latestStates = pipelineStats.getVehicleStates();
      if (latestStates.length > 0) {
        const snapshot = encodeTelemetryBatch(latestStates);
        if (snapshot.validCount > 0) {
          socket.emit('telemetry:batch', snapshot.buffer);
        }
      }
    } catch (err) {
      console.error('[Socket.IO] Error sending initial snapshot to client:', err);
    }

    socket.on('disconnect', (reason) => {
      const remaining = io.engine.clientsCount;
      console.log(`[Socket.IO] Client disconnected (${reason}). Remaining clients: ${remaining}`);
    });

    socket.on('error', (err) => {
      console.warn(`[Socket.IO] Socket error: ${err.message}`);
    });
  });

  // Start the broadcaster connected to the message broker
  void broadcaster.start(io, broker);

  const shutdown = async (): Promise<void> => {
    console.log('[Socket.IO] Shutting down broadcaster and disconnecting clients...');
    await broadcaster.stop();

    await new Promise<void>((resolve) => {
      io.close(() => {
        console.log('[Socket.IO] Server closed cleanly.');
        resolve();
      });
    });

    activeSocketServer = null;
  };

  activeSocketServer = { io, broadcaster, shutdown };
  return activeSocketServer;
}

export function getSocketServer(): SocketServerInstance | null {
  return activeSocketServer;
}
