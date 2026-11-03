import { RawCoordinatePoint, ProcessedPoint, RejectedPoint, BatchProcessResult } from '../types/telemetry';

/**
 * Validates a single coordinate point according to strict boundary rules:
 * - Must be a non-null, non-array object
 * - vehicleId must be a non-empty string
 * - latitude must be a finite number in [-90, 90] (rejects NaN, Infinity, strings, null, booleans)
 * - longitude must be a finite number in [-180, 180] (rejects NaN, Infinity, strings, null, booleans)
 */
export function validateCoordinatePoint(point: unknown): { valid: true } | { valid: false; reason: string } {
  if (!point || typeof point !== 'object' || Array.isArray(point)) {
    return { valid: false, reason: 'Point must be a valid non-null object' };
  }

  const p = point as Record<string, unknown>;

  if (typeof p.vehicleId !== 'string' || p.vehicleId.trim() === '') {
    return { valid: false, reason: 'Missing or invalid vehicleId: must be a non-empty string' };
  }

  if (typeof p.latitude !== 'number' || !Number.isFinite(p.latitude) || Number.isNaN(p.latitude)) {
    return { valid: false, reason: `Invalid latitude: ${String(p.latitude)} (must be a finite number)` };
  }

  if (p.latitude < -90 || p.latitude > 90) {
    return { valid: false, reason: `Latitude out of range: ${p.latitude} (must be between -90 and 90)` };
  }

  if (typeof p.longitude !== 'number' || !Number.isFinite(p.longitude) || Number.isNaN(p.longitude)) {
    return { valid: false, reason: `Invalid longitude: ${String(p.longitude)} (must be a finite number)` };
  }

  if (p.longitude < -180 || p.longitude > 180) {
    return { valid: false, reason: `Longitude out of range: ${p.longitude} (must be between -180 and 180)` };
  }

  return { valid: true };
}

/**
 * Pure coordinate batch processor:
 * - Validates each point independently (one bad point never fails the batch)
 * - Rounds valid coordinates to 6 decimal places
 * - Attaches derived processedAt timestamp
 * - Preserves all original telemetry fields
 * - Returns processed points, rejected points with original indices, and batch stats
 */
export function processCoordinateBatch(points: RawCoordinatePoint[]): BatchProcessResult {
  const startTime = performance.now();

  const processed: ProcessedPoint[] = [];
  const rejected: RejectedPoint[] = [];

  if (!Array.isArray(points)) {
    return {
      processed,
      rejected,
      stats: {
        received: 0,
        valid: 0,
        invalid: 0,
        durationMs: 0,
      },
    };
  }

  const now = Date.now();

  for (let i = 0; i < points.length; i++) {
    const rawPoint = points[i];
    const validation = validateCoordinatePoint(rawPoint);

    if (validation.valid) {
      const p = rawPoint as RawCoordinatePoint;
      const roundedLat = Number(p.latitude.toFixed(6));
      const roundedLng = Number(p.longitude.toFixed(6));

      processed.push({
        ...p,
        latitude: roundedLat,
        longitude: roundedLng,
        processedAt: now,
      });
    } else {
      rejected.push({
        index: i,
        reason: validation.reason,
      });
    }
  }

  const durationMs = Number((performance.now() - startTime).toFixed(3));

  return {
    processed,
    rejected,
    stats: {
      received: points.length,
      valid: processed.length,
      invalid: rejected.length,
      durationMs,
    },
  };
}
