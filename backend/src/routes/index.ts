import { Router } from 'express';
import { healthRouter } from './health.routes';
import { telemetryRouter } from './telemetry.routes';

const router = Router();

router.use('/', healthRouter);
router.use('/', telemetryRouter);

export const apiRouter = router;
