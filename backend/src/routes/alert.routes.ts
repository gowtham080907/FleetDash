import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../db/database';
import { AppError } from '../utils/AppError';
import { optionalAuth } from '../middleware/auth.middleware';

const router = Router();

// GET /api/alerts - List all incident alerts
router.get('/alerts', optionalAuth, (req: Request, res: Response) => {
  const { severity, acknowledged, limit } = req.query as Record<string, string | undefined>;

  const alerts = db.getAlerts({
    severity,
    acknowledged: acknowledged !== undefined ? acknowledged === 'true' : undefined,
    limit: limit ? parseInt(limit, 10) : 100,
  });

  res.status(200).json(alerts);
});

// POST /api/alerts/:id/ack - Acknowledge alert
router.post('/alerts/:id/ack', optionalAuth, (req: Request, res: Response, next: NextFunction) => {
  const id = req.params.id;
  if (!id) {
    return next(new AppError('Alert ID is required', 400, 'BAD_REQUEST'));
  }
  const acknowledged = db.acknowledgeAlert(id);

  if (!acknowledged) {
    return next(new AppError(`Alert ${id} not found`, 404, 'NOT_FOUND'));
  }

  res.status(200).json(acknowledged);
});

// DELETE /api/alerts - Clear all alerts
router.delete('/alerts', optionalAuth, (_req: Request, res: Response) => {
  db.clearAllAlerts();
  res.status(200).json({ success: true, message: 'All alerts cleared' });
});

export const alertRouter = router;
