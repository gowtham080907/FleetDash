import { Router, Request, Response } from 'express';
import { db } from '../db/database';
import { pipelineStats } from '../services/pipelineStats.service';

const router = Router();

// GET /api/fleet/stats - Aggregate fleet stats for KPI cards
router.get('/fleet/stats', (_req: Request, res: Response) => {
  const pipe = pipelineStats.getStats();
  const stats = db.getFleetStats(pipe.eventsPerSecond);
  res.status(200).json(stats);
});

// GET /api/telemetry/stats - Time-series and distribution analytics for Recharts
router.get('/telemetry/stats', (_req: Request, res: Response) => {
  const analytics = db.getDashboardAnalytics();
  res.status(200).json(analytics);
});

export const fleetRouter = router;
