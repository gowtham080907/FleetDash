import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../db/database';
import { AppError } from '../utils/AppError';
import { Vehicle, VehicleFilterParams } from '../types/vehicle';
import { optionalAuth } from '../middleware/auth.middleware';

const router = Router();

// GET /api/vehicles - Paginated and filtered vehicle list
router.get('/vehicles', optionalAuth, (req: Request, res: Response) => {
  const {
    search,
    status,
    geofenceStatus,
    sortBy,
    sortOrder,
    page,
    pageSize,
  } = req.query as Record<string, string | undefined>;

  const params: VehicleFilterParams = {
    search,
    status: status as any,
    geofenceStatus: geofenceStatus as any,
    sortBy: sortBy as any,
    sortOrder: (sortOrder as 'asc' | 'desc') || 'asc',
    page: page ? parseInt(page, 10) : 1,
    pageSize: pageSize ? parseInt(pageSize, 10) : 10,
  };

  const result = db.getVehicles(params);
  res.status(200).json(result);
});

// GET /api/vehicles/:id - Single vehicle
router.get('/vehicles/:id', optionalAuth, (req: Request, res: Response, next: NextFunction) => {
  const id = req.params.id;
  if (!id) return next(new AppError('Vehicle ID required', 400, 'BAD_REQUEST'));
  const vehicle = db.getVehicleById(id);

  if (!vehicle) {
    return next(new AppError(`Vehicle ${id} not found`, 404, 'NOT_FOUND'));
  }

  res.status(200).json(vehicle);
});

// GET /api/vehicles/:id/history - Telemetry breadcrumb trail
router.get('/vehicles/:id/history', optionalAuth, (req: Request, res: Response, next: NextFunction) => {
  const id = req.params.id;
  if (!id) return next(new AppError('Vehicle ID required', 400, 'BAD_REQUEST'));
  const vehicle = db.getVehicleById(id);

  if (!vehicle) {
    return next(new AppError(`Vehicle ${id} not found`, 404, 'NOT_FOUND'));
  }

  const breadcrumbs = db.getBreadcrumbs(id);
  res.status(200).json({ vehicleId: id, breadcrumbs });
});

// POST /api/vehicles - Register new vehicle
router.post('/vehicles', optionalAuth, (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, name, driverName, model, status, speed, heading, latitude, longitude, fuelLevel } = req.body;

    if (!id || !name) {
      throw new AppError('Vehicle ID and Name are required', 400, 'MISSING_FIELDS');
    }

    const existing = db.getVehicleById(id);
    if (existing) {
      throw new AppError(`Vehicle with ID ${id} already exists`, 409, 'CONFLICT');
    }

    const newVehicle: Vehicle = {
      id: id.toUpperCase().trim(),
      name: name.trim(),
      driverName: driverName?.trim() || 'Unassigned Driver',
      model: model?.trim() || 'Commercial Cascadia',
      status: status || 'idle',
      speed: speed || 0,
      heading: heading || 0,
      latitude: latitude !== undefined ? Number(latitude) : 41.8781,
      longitude: longitude !== undefined ? Number(longitude) : -87.6298,
      lastUpdated: Date.now(),
      geofenceStatus: 'inside',
      currentGeofence: 'Metro Distribution Hub A',
      fuelLevel: fuelLevel !== undefined ? Number(fuelLevel) : 100,
      odometer: 10000,
    };

    const saved = db.createVehicle(newVehicle);
    res.status(201).json(saved);
  } catch (err) {
    next(err);
  }
});

// PUT /api/vehicles/:id - Update existing vehicle
router.put('/vehicles/:id', optionalAuth, (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id;
    if (!id) return next(new AppError('Vehicle ID required', 400, 'BAD_REQUEST'));
    const existing = db.getVehicleById(id);

    if (!existing) {
      throw new AppError(`Vehicle ${id} not found`, 404, 'NOT_FOUND');
    }

    const updated = db.updateVehicle(id, req.body);
    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/vehicles/:id - Remove vehicle
router.delete('/vehicles/:id', optionalAuth, (req: Request, res: Response, next: NextFunction) => {
  const id = req.params.id;
  if (!id) return next(new AppError('Vehicle ID required', 400, 'BAD_REQUEST'));
  const deleted = db.deleteVehicle(id);

  if (!deleted) {
    return next(new AppError(`Vehicle ${id} not found`, 404, 'NOT_FOUND'));
  }

  res.status(200).json({ success: true, message: `Vehicle ${id} removed from registry` });
});

export const vehicleRouter = router;
