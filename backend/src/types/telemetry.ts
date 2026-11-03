/**
 * Mirrors frontend telemetry field names and types from src/types/telemetry.ts.
 * Independent backend types; do NOT import from frontend src/.
 */

export interface RawCoordinatePoint {
  vehicleId: string;
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  timestamp?: number;
  status?: 'active' | 'idle' | 'offline' | string;
  geofenceStatus?: 'inside' | 'breached' | 'clear' | 'none' | string;
  altitude?: number;
  [key: string]: unknown;
}

export interface ProcessedPoint extends RawCoordinatePoint {
  processedAt: number;
}

export interface RejectedPoint {
  index: number;
  reason: string;
}

export interface BatchStats {
  received: number;
  valid: number;
  invalid: number;
  durationMs: number;
}

export interface BatchProcessResult {
  processed: ProcessedPoint[];
  rejected: RejectedPoint[];
  stats: BatchStats;
}
