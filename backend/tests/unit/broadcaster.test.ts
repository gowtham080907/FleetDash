import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TelemetryBroadcaster } from '../../src/socket/broadcaster';
import { MemoryBroker } from '../../src/services/broker/memoryBroker';
import { encodeTelemetryBatch } from '../../src/workers/binaryEncoder';
import { Server } from 'socket.io';

describe('TelemetryBroadcaster Unit Tests', () => {
  let broadcaster: TelemetryBroadcaster;
  let mockIo: Server;
  let mockEmit: ReturnType<typeof vi.fn>;
  let mockSocketMap: Map<string, unknown>;

  beforeEach(() => {
    mockEmit = vi.fn();
    mockSocketMap = new Map();

    mockIo = {
      sockets: {
        sockets: mockSocketMap,
      },
    } as unknown as Server;

    // Fast flush interval (20ms) and max batch size of 5 records
    broadcaster = new TelemetryBroadcaster(20, 5);
  });

  afterEach(async () => {
    await broadcaster.stop();
  });

  it('flushes immediately when max batch size threshold is reached', async () => {
    const broker = new MemoryBroker();
    await broker.connect();
    await broadcaster.start(mockIo, broker);

    const mockSocket = {
      id: 'socket-1',
      conn: { transport: { writable: true } },
      volatile: { emit: mockEmit },
    };
    mockSocketMap.set('socket-1', mockSocket);

    // Generate 5 valid records (exactly reaching the max batch size of 5)
    const records = Array.from({ length: 5 }, (_, i) => ({
      vehicleId: `VH-${100 + i}`,
      latitude: 17.385,
      longitude: 78.486,
    }));
    const encoded = encodeTelemetryBatch(records);
    const buf = Buffer.from(encoded.buffer);

    broadcaster.handleIncomingChunk(buf);

    expect(mockEmit).toHaveBeenCalledTimes(1);
    expect(mockEmit).toHaveBeenCalledWith('telemetry:batch', expect.any(Buffer));
    const emittedBuffer = mockEmit.mock.calls[0]![1] as Buffer;
    expect(emittedBuffer.length).toBe(5 * 32);
  });

  it('flushes on interval if threshold is not reached', async () => {
    const broker = new MemoryBroker();
    await broker.connect();
    await broadcaster.start(mockIo, broker);

    const mockSocket = {
      id: 'socket-1',
      conn: { transport: { writable: true } },
      volatile: { emit: mockEmit },
    };
    mockSocketMap.set('socket-1', mockSocket);

    // Generate 2 records (below threshold of 5)
    const records = [
      { vehicleId: 'VH-1', latitude: 10, longitude: 20 },
      { vehicleId: 'VH-2', latitude: 11, longitude: 21 },
    ];
    const encoded = encodeTelemetryBatch(records);
    broadcaster.handleIncomingChunk(Buffer.from(encoded.buffer));

    expect(mockEmit).not.toHaveBeenCalled();

    // Wait for the 20ms interval flush
    await new Promise((r) => setTimeout(r, 60));

    expect(mockEmit).toHaveBeenCalledTimes(1);
    const emittedBuffer = mockEmit.mock.calls[0]![1] as Buffer;
    expect(emittedBuffer.length).toBe(2 * 32);
  });

  it('coalesces multiple incoming chunks and preserves ordering', async () => {
    const broker = new MemoryBroker();
    await broker.connect();
    await broadcaster.start(mockIo, broker);

    const mockSocket = {
      id: 'socket-1',
      conn: { transport: { writable: true } },
      volatile: { emit: mockEmit },
    };
    mockSocketMap.set('socket-1', mockSocket);

    const chunk1 = Buffer.from(encodeTelemetryBatch([{ vehicleId: 'VH-1', latitude: 10, longitude: 20 }]).buffer);
    const chunk2 = Buffer.from(encodeTelemetryBatch([{ vehicleId: 'VH-2', latitude: 11, longitude: 21 }]).buffer);

    broadcaster.handleIncomingChunk(chunk1);
    broadcaster.handleIncomingChunk(chunk2);

    broadcaster.flush();

    expect(mockEmit).toHaveBeenCalledTimes(1);
    const combined = mockEmit.mock.calls[0]![1] as Buffer;
    expect(combined.length).toBe(2 * 32);
  });

  it('skips slow clients whose transport writable is false', async () => {
    const broker = new MemoryBroker();
    await broker.connect();
    await broadcaster.start(mockIo, broker);

    const fastEmit = vi.fn();
    const slowEmit = vi.fn();

    mockSocketMap.set('fast-client', {
      id: 'fast-client',
      conn: { transport: { writable: true } },
      volatile: { emit: fastEmit },
    });

    mockSocketMap.set('slow-client', {
      id: 'slow-client',
      conn: { transport: { writable: false } }, // Unwritable transport
      volatile: { emit: slowEmit },
    });

    const chunk = Buffer.from(encodeTelemetryBatch([{ vehicleId: 'VH-1', latitude: 10, longitude: 20 }]).buffer);
    broadcaster.handleIncomingChunk(chunk);
    broadcaster.flush();

    expect(fastEmit).toHaveBeenCalledTimes(1);
    expect(slowEmit).not.toHaveBeenCalled();
  });
});
