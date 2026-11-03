import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env';
import { AppError } from '../utils/AppError';

/**
 * Cheap main-thread validation middleware:
 * Validates the outer request envelope and batch size limit.
 * Heavy per-point coordinate bounds checking is intentionally left to the worker thread.
 */
export function validateBatch(req: Request, _res: Response, next: NextFunction): void {
  const body = req.body as unknown;

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return next(
      new AppError(
        'Request body must be a JSON object containing a "points" array',
        400,
        'INVALID_REQUEST_BODY',
        [{ expected: { points: 'RawCoordinatePoint[]' } }]
      )
    );
  }

  const { points } = body as { points?: unknown };

  if (points === undefined || points === null) {
    return next(
      new AppError(
        'Missing required field "points" in request body',
        400,
        'MISSING_POINTS_FIELD',
        [{ field: 'points' }]
      )
    );
  }

  if (!Array.isArray(points)) {
    return next(
      new AppError(
        'Field "points" must be an array',
        400,
        'POINTS_NOT_ARRAY',
        [{ receivedType: typeof points }]
      )
    );
  }

  if (points.length === 0) {
    return next(
      new AppError(
        'Field "points" cannot be empty. Must contain at least 1 coordinate point',
        400,
        'EMPTY_BATCH',
        [{ minItems: 1 }]
      )
    );
  }

  if (points.length > config.MAX_BATCH_SIZE) {
    return next(
      new AppError(
        `Batch size ${points.length} exceeds maximum allowed limit of ${config.MAX_BATCH_SIZE}`,
        413,
        'BATCH_TOO_LARGE',
        [{ count: points.length, maxLimit: config.MAX_BATCH_SIZE }]
      )
    );
  }

  next();
}
