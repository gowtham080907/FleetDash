import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { AddressInfo } from 'net';
import { io as ioClient, Socket } from 'socket.io-client';
import { app } from '../../src/app';
import { MemoryBroker } from '../../src/services/broker/memoryBroker';
import { initSocketServer, SocketServerInstance } from '../../src/socket/socketServer';

describe('Socket.IO CORS Integration Tests', () => {
  let server: http.Server;
  let socketInstance: SocketServerInstance;
  let broker: MemoryBroker;
  let serverPort: number;

  beforeAll(async () => {
    broker = new MemoryBroker();
    await broker.connect();

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
  });

  it('allows connection from configured frontend origin (http://localhost:5173)', async () => {
    const client: Socket = ioClient(`http://localhost:${serverPort}`, {
      path: '/socket.io',
      transports: ['websocket'],
      extraHeaders: {
        Origin: 'http://localhost:5173',
      },
      timeout: 3000,
    });

    await new Promise<void>((resolve, reject) => {
      client.on('connect', () => {
        expect(client.connected).toBe(true);
        client.disconnect();
        resolve();
      });
      client.on('connect_error', (err) => {
        reject(err);
      });
    });
  });

  it('rejects connection from unauthorized origin', async () => {
    const client: Socket = ioClient(`http://localhost:${serverPort}`, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      extraHeaders: {
        Origin: 'http://unauthorized-malicious-domain.com',
      },
      timeout: 3000,
    });

    const errorResult = await new Promise<Error>((resolve) => {
      client.on('connect', () => {
        client.disconnect();
        resolve(new Error('Should not have connected'));
      });
      client.on('connect_error', (err) => {
        resolve(err);
      });
    });

    expect(errorResult).toBeInstanceOf(Error);
    client.disconnect();
  });
});
