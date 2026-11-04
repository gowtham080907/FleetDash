import { Router, Request, Response, NextFunction } from 'express';
import { validateBatch } from '../middleware/validateBatch';
import { telemetryService } from '../services/telemetry.service';
import { RawCoordinatePoint } from '../types/telemetry';

/**
 * CONTRACT ALIGNMENT NOTE:
 * The following endpoints from docs/api-contract.md are planned for subsequent weeks:
 * - GET /api/fleet/stats        -> Week 2 (Fleet metrics aggregation service)
 * - GET /api/vehicles           -> Week 2 (Vehicle repository & pagination)
 * - GET /api/vehicles/:id       -> Week 2 (Single-unit telemetry state)
 * - GET /api/telemetry/stats    -> Week 3 (Time-series historical analytics)
 * - Socket.IO telemetry:batch   -> Week 3 (WebSocket duplex streaming pipeline)
 * - Geofence breach detection   -> Week 4 (Worker-thread ray-casting engine)
 */

import { getBroker } from '../services/broker';
import { getSocketServer } from '../socket/socketServer';
import { pipelineStats } from '../services/pipelineStats.service';

const router = Router();

// Week 1 endpoint: process batch and return processed points (preserved unchanged)
router.post(
  '/telemetry/process-batch',
  validateBatch,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { points } = req.body as { points: RawCoordinatePoint[] };
      const result = await telemetryService.processBatch(points);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);

// Week 2 endpoint: ingest batch into worker encoder + broker pub/sub pipeline
router.post(
  '/telemetry/ingest',
  validateBatch,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { points } = req.body as { points: RawCoordinatePoint[] };
      const result = await telemetryService.ingestBatch(points);
      res.status(202).json(result);
    } catch (err) {
      next(err);
    }
  }
);

// Week 2 endpoint: pipeline telemetry metrics & rates
router.get('/telemetry/pipeline-stats', (_req: Request, res: Response) => {
  const broker = getBroker();
  const socketServer = getSocketServer();
  const stats = pipelineStats.getStats();

  res.status(200).json({
    ...stats,
    broker: {
      type: broker.getBrokerType(),
      healthy: broker.isHealthy(),
    },
    socket: {
      connectedClients: socketServer ? socketServer.io.engine.clientsCount : 0,
      skippedFrames: stats.skippedFrames,
    },
  });
});

export const telemetryRouter = router;
