import { Router } from 'express';
import { healthRouter } from './health.routes';
import { telemetryRouter } from './telemetry.routes';
import { authRouter } from './auth.routes';
import { vehicleRouter } from './vehicle.routes';
import { fleetRouter } from './fleet.routes';
import { geofenceRouter } from './geofence.routes';
import { alertRouter } from './alert.routes';

const router = Router();

router.use('/', healthRouter);
router.use('/', telemetryRouter);
router.use('/', authRouter);
router.use('/', vehicleRouter);
router.use('/', fleetRouter);
router.use('/', geofenceRouter);
router.use('/', alertRouter);

export const apiRouter = router;
