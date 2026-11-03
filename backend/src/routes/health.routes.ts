import { Router, Request, Response } from 'express';
import { workerPool } from '../services/workerPool.service';
import { getBroker } from '../services/broker';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  const workerStatus = workerPool.getStatus();
  const broker = getBroker();

  res.status(200).json({
    status: 'ok',
    service: 'fleetdash-backend',
    uptime: Number(process.uptime().toFixed(2)),
    timestamp: new Date().toISOString(),
    worker: {
      ready: workerStatus.ready,
      poolSize: workerStatus.poolSize,
    },
    broker: {
      type: broker.getBrokerType(),
      healthy: broker.isHealthy(),
    },
  });
});

export const healthRouter = router;
