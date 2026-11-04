import crypto from 'crypto';
import { workerPool } from './workerPool.service';
import { RawCoordinatePoint, BatchProcessResult, RejectedPoint } from '../types/telemetry';
import { WorkerRequest } from '../types/worker-protocol';
import { AppError } from '../utils/AppError';
import { pipelineStats } from './pipelineStats.service';
import { getBroker } from './broker';
import { config } from '../config/env';

export interface ProcessBatchResponse {
  success: boolean;
  requestId: string;
  stats: BatchProcessResult['stats'];
  processed: BatchProcessResult['processed'];
  rejected: BatchProcessResult['rejected'];
}

export interface IngestBatchResponse {
  success: boolean;
  requestId: string;
  accepted: number;
  rejected: RejectedPoint[];
  published: number;
}

export class TelemetryService {
  /**
   * Offloads coordinate batch processing to the worker pool.
   * Keeps CPU-intensive validation and normalization off the Express event loop.
   */
  public async processBatch(points: RawCoordinatePoint[]): Promise<ProcessBatchResponse> {
    const requestId = crypto.randomUUID();

    const request: WorkerRequest = {
      type: 'PROCESS_COORDINATES',
      requestId,
      payload: {
        points,
      },
    };

    const response = await workerPool.run(request);

    if (response.type === 'RESULT') {
      return {
        success: true,
        requestId,
        stats: response.payload.stats,
        processed: response.payload.processed,
        rejected: response.payload.rejected,
      };
    }

    if (response.type === 'ERROR') {
      throw new AppError(
        response.error.message,
        500,
        response.error.code,
        [{ requestId }]
      );
    }

    throw new AppError(
      `Unexpected worker response type: ${(response as { type: string }).type}`,
      500,
      'WORKER_UNEXPECTED_RESPONSE',
      [{ requestId }]
    );
  }

  /**
   * Week 2 Ingestion Pipeline:
   * 1. Checks backpressure limit (INGEST_MAX_QUEUE)
   * 2. Offloads validation + binary encoding to worker thread (zero-copy ArrayBuffer)
   * 3. Publishes binary Buffer to message broker (Redis or Memory)
   * 4. Updates in-memory vehicle state store
   * 5. Returns 202 Accepted status
   */
  public async ingestBatch(points: RawCoordinatePoint[]): Promise<IngestBatchResponse> {
    const pointsCount = points.length;

    // Enforce backpressure bounded queue limit
    if (pipelineStats.getInFlightCount() + pointsCount > config.INGEST_MAX_QUEUE) {
      pipelineStats.recordDropped(pointsCount);
      throw new AppError(
        `Telemetry ingestion queue full: ${pipelineStats.getInFlightCount()} in-flight exceeds limit of ${config.INGEST_MAX_QUEUE}`,
        503,
        'INGESTION_QUEUE_FULL',
        [{ inFlight: pipelineStats.getInFlightCount(), maxLimit: config.INGEST_MAX_QUEUE }]
      );
    }

    pipelineStats.incrementInFlight(pointsCount);
    pipelineStats.recordReceived(pointsCount);

    const requestId = crypto.randomUUID();

    try {
      const response = await workerPool.run({
        type: 'ENCODE_BATCH',
        requestId,
        payload: { points },
      });

      if (response.type === 'ENCODE_RESULT') {
        const { buffer, validCount, rejected, validRecords } = response.payload;

        pipelineStats.recordAccepted(validCount);
        pipelineStats.recordRejected(rejected.length);

        // Update latest vehicle cache for new client snapshots
        for (const record of validRecords) {
          pipelineStats.setVehicleState(record.vehicleId, record);
        }

        let published = 0;
        if (validCount > 0 && buffer.byteLength > 0) {
          const broker = getBroker();
          const nodeBuffer = Buffer.from(buffer);
          await broker.publish(config.REDIS_CHANNEL_TELEMETRY, nodeBuffer);
          pipelineStats.recordPublished(validCount);
          published = validCount;
        }

        return {
          success: true,
          requestId,
          accepted: validCount,
          rejected,
          published,
        };
      }

      if (response.type === 'ERROR') {
        pipelineStats.recordDropped(pointsCount);
        throw new AppError(
          response.error.message,
          500,
          response.error.code,
          [{ requestId }]
        );
      }

      throw new AppError(
        `Unexpected worker response type: ${(response as { type: string }).type}`,
        500,
        'WORKER_UNEXPECTED_RESPONSE',
        [{ requestId }]
      );
    } finally {
      pipelineStats.decrementInFlight(pointsCount);
    }
  }
}

export const telemetryService = new TelemetryService();

