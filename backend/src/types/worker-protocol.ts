import { RawCoordinatePoint, ProcessedPoint, RejectedPoint, BatchStats } from './telemetry';

export type WorkerRequest =
  | { type: 'PROCESS_COORDINATES'; requestId: string; payload: { points: RawCoordinatePoint[] } }
  | { type: 'ENCODE_BATCH'; requestId: string; payload: { points: RawCoordinatePoint[] } }
  | { type: 'PING'; requestId: string }
  | { type: 'SLEEP'; requestId: string; payload: { delayMs: number } };

export type WorkerResponse =
  | { type: 'RESULT'; requestId: string; payload: { processed: ProcessedPoint[]; rejected: RejectedPoint[]; stats: BatchStats } }
  | {
      type: 'ENCODE_RESULT';
      requestId: string;
      payload: {
        buffer: ArrayBuffer;
        validCount: number;
        rejected: RejectedPoint[];
        validRecords: RawCoordinatePoint[];
        durationMs: number;
      };
    }
  | { type: 'ERROR'; requestId: string; error: { code: string; message: string } }
  | { type: 'PONG'; requestId: string }
  | { type: 'READY' };
