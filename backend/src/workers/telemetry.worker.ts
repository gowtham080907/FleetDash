import { parentPort } from 'worker_threads';
import { WorkerRequest, WorkerResponse } from '../types/worker-protocol';
import { processCoordinateBatch } from './coordinateProcessor';
import { encodeTelemetryBatch } from './binaryEncoder';

if (!parentPort) {
  throw new Error('telemetry.worker must be spawned as a worker_thread');
}

const port = parentPort;

// Post READY once initialized
port.postMessage({ type: 'READY' } satisfies WorkerResponse);

// Listen for incoming requests
port.on('message', (message: WorkerRequest) => {
  if (!message || typeof message !== 'object') {
    return;
  }

  const { type, requestId } = message;

  try {
    switch (type) {
      case 'PING': {
        const response: WorkerResponse = {
          type: 'PONG',
          requestId,
        };
        port.postMessage(response);
        break;
      }

      case 'SLEEP': {
        const delay = message.payload.delayMs;
        setTimeout(() => {
          port.postMessage({ type: 'PONG', requestId } satisfies WorkerResponse);
        }, delay);
        break;
      }

      case 'PROCESS_COORDINATES': {
        const { points } = message.payload;
        const result = processCoordinateBatch(points);

        const response: WorkerResponse = {
          type: 'RESULT',
          requestId,
          payload: result,
        };
        port.postMessage(response);
        break;
      }

      case 'ENCODE_BATCH': {
        const startTime = performance.now();
        const { points } = message.payload;
        const encodeResult = encodeTelemetryBatch(points);
        const durationMs = Number((performance.now() - startTime).toFixed(3));

        const response: WorkerResponse = {
          type: 'ENCODE_RESULT',
          requestId,
          payload: {
            buffer: encodeResult.buffer,
            validCount: encodeResult.validCount,
            rejected: encodeResult.rejected,
            validRecords: encodeResult.validRecords,
            durationMs,
          },
        };

        // Zero-copy transfer list
        port.postMessage(response, [encodeResult.buffer]);
        break;
      }

      default: {
        const response: WorkerResponse = {
          type: 'ERROR',
          requestId,
          error: {
            code: 'UNKNOWN_REQUEST_TYPE',
            message: `Unrecognized request type: ${(message as { type: string }).type}`,
          },
        };
        port.postMessage(response);
        break;
      }
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown worker thread execution error';
    const response: WorkerResponse = {
      type: 'ERROR',
      requestId,
      error: {
        code: 'WORKER_INTERNAL_ERROR',
        message: errorMsg,
      },
    };
    port.postMessage(response);
  }
});
