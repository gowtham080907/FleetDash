import { Server } from 'socket.io';
import { MessageBroker } from '../services/broker/broker.types';
import { config } from '../config/env';
import { pipelineStats } from '../services/pipelineStats.service';
import { BINARY_RECORD_SIZE } from '../workers/binaryEncoder';

export class TelemetryBroadcaster {
  private io: Server | null = null;
  private broker: MessageBroker | null = null;
  private pendingBuffers: Buffer[] = [];
  private pendingRecordCount = 0;
  private flushTimer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private batchIntervalMs: number;
  private maxBatchRecords: number;

  constructor(
    batchIntervalMs = config.SOCKET_BATCH_INTERVAL_MS,
    maxBatchRecords = config.SOCKET_MAX_BATCH_RECORDS
  ) {
    this.batchIntervalMs = batchIntervalMs;
    this.maxBatchRecords = maxBatchRecords;
  }

  public async start(io: Server, broker: MessageBroker): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.io = io;
    this.broker = broker;
    this.isRunning = true;
    this.pendingBuffers = [];
    this.pendingRecordCount = 0;

    // Subscribe to broker telemetry channel for raw binary buffers
    await this.broker.subscribe(
      config.REDIS_CHANNEL_TELEMETRY,
      (_channel: string, data: Buffer) => {
        this.handleIncomingChunk(data);
      }
    );

    // Periodic flush timer
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.batchIntervalMs);

    // Unref timer so it doesn't prevent Node process exit
    if (this.flushTimer.unref) {
      this.flushTimer.unref();
    }
  }

  /**
   * Enqueues incoming binary chunk from broker and triggers immediate flush
   * if batch size threshold is reached.
   */
  public handleIncomingChunk(data: Buffer): void {
    if (!this.isRunning || !data || data.length === 0) {
      return;
    }

    if (data.length % BINARY_RECORD_SIZE !== 0) {
      console.warn(
        `[Broadcaster] Received binary buffer with non-aligned byte length: ${data.length}`
      );
      return;
    }

    const recordCount = data.length / BINARY_RECORD_SIZE;
    this.pendingBuffers.push(data);
    this.pendingRecordCount += recordCount;

    if (this.pendingRecordCount >= this.maxBatchRecords) {
      this.flush();
    }
  }

  /**
   * Flushes coalesced binary frames to connected Socket.IO clients.
   * Performs per-client backpressure checks to drop frames for stalled sockets.
   */
  public flush(): void {
    if (!this.isRunning || !this.io || this.pendingBuffers.length === 0) {
      return;
    }

    const buffersToFlush = this.pendingBuffers;
    const recordCount = this.pendingRecordCount;

    this.pendingBuffers = [];
    this.pendingRecordCount = 0;

    if (buffersToFlush.length === 0 || recordCount === 0) {
      return;
    }

    // Coalesce into a single contiguous binary buffer
    const combinedBuffer = Buffer.concat(buffersToFlush);

    // Track broadcast metric
    pipelineStats.recordBroadcast(recordCount);

    const sockets = this.io.sockets?.sockets;
    if (!sockets || sockets.size === 0) {
      return;
    }

    for (const [, socket] of sockets) {
      try {
        const transport = (socket.conn as unknown as { transport?: { writable?: boolean } }).transport;
        if (transport && transport.writable === false) {
          // Slow client cannot write currently; drop frame to prevent memory leak
          pipelineStats.recordSkippedFrame(1);
          continue;
        }

        // Deliver binary ArrayBuffer/Buffer over volatile channel
        socket.volatile.emit('telemetry:batch', combinedBuffer);
      } catch (err) {
        console.error(`[Broadcaster] Error emitting to socket ${socket.id}:`, err);
        pipelineStats.recordSkippedFrame(1);
      }
    }
  }

  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    // Final flush of remaining buffered records
    this.flush();

    if (this.broker) {
      try {
        await this.broker.unsubscribe(config.REDIS_CHANNEL_TELEMETRY);
      } catch (err) {
        console.warn('[Broadcaster] Failed to unsubscribe from broker:', err);
      }
      this.broker = null;
    }

    this.io = null;
    this.pendingBuffers = [];
    this.pendingRecordCount = 0;
  }
}

export const broadcaster = new TelemetryBroadcaster();
