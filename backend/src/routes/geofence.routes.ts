import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../db/database';
import { AppError } from '../utils/AppError';
import { GeofenceZone } from '../types/geofence';
import { geofenceService } from '../services/geofence.service';
import { optionalAuth } from '../middleware/auth.middleware';

const router = Router();

// GET /api/geofences - List all geofences
router.get('/geofences', optionalAuth, (_req: Request, res: Response) => {
  geofenceService.updateZoneCounts();
  const zones = db.getGeofences();
  res.status(200).json(zones);
});

// GET /api/geofences/:id - Get single geofence
router.get('/geofences/:id', optionalAuth, (req: Request, res: Response, next: NextFunction) => {
  const id = req.params.id;
  if (!id) return next(new AppError('Geofence ID required', 400, 'BAD_REQUEST'));
  const zone = db.getGeofenceById(id);

  if (!zone) {
    return next(new AppError(`Geofence ${id} not found`, 404, 'NOT_FOUND'));
  }

  res.status(200).json(zone);
});

// POST /api/geofences - Create new geofence zone
router.post('/geofences', optionalAuth, (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, type, center, radiusMeters, coordinates, color, speedLimitKmH, description } = req.body;

    if (!name || !type) {
      throw new AppError('Name and type are required', 400, 'MISSING_FIELDS');
    }

    if (type === 'circle' && (!center || !radiusMeters)) {
      throw new AppError('Circle geofence requires center [lat, lng] and radiusMeters', 400, 'INVALID_GEOMETRY');
    }

    if (type === 'polygon' && (!coordinates || coordinates.length < 3)) {
      throw new AppError('Polygon geofence requires coordinates array with at least 3 vertices', 400, 'INVALID_GEOMETRY');
    }

    const id = `geo-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newZone: GeofenceZone = {
      id,
      name: name.trim(),
      type,
      center,
      radiusMeters,
      coordinates,
      color: color || '#0066FF',
      fillOpacity: 0.15,
      speedLimitKmH: speedLimitKmH ? Number(speedLimitKmH) : 50,
      description: description || 'Custom operational geofence zone',
      visible: true,
      activeVehiclesCount: 0,
      breachCount: 0,
    };

    const saved = db.createGeofence(newZone);
    geofenceService.updateZoneCounts();
    res.status(201).json(saved);
  } catch (err) {
    next(err);
  }
});

// PUT /api/geofences/:id - Update existing geofence
router.put('/geofences/:id', optionalAuth, (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id;
    if (!id) return next(new AppError('Geofence ID required', 400, 'BAD_REQUEST'));
    const existing = db.getGeofenceById(id);

    if (!existing) {
      throw new AppError(`Geofence ${id} not found`, 404, 'NOT_FOUND');
    }

    const updated = db.updateGeofence(id, req.body);
    geofenceService.updateZoneCounts();
    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/geofences/:id - Remove geofence
router.delete('/geofences/:id', optionalAuth, (req: Request, res: Response, next: NextFunction) => {
  const id = req.params.id;
  if (!id) return next(new AppError('Geofence ID required', 400, 'BAD_REQUEST'));
  const deleted = db.deleteGeofence(id);

  if (!deleted) {
    return next(new AppError(`Geofence ${id} not found`, 404, 'NOT_FOUND'));
  }

  res.status(200).json({ success: true, message: `Geofence ${id} removed` });
});

export const geofenceRouter = router;
