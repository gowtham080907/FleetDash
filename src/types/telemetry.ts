export interface VehicleTelemetry {
  vehicleId: string;
  latitude: number;
  longitude: number;
  speed: number; // km/h
  heading: number; // degrees 0-360
  timestamp: number; // unix epoch ms
  status: 'active' | 'idle' | 'offline';
  geofenceStatus?: 'inside' | 'breached' | 'clear' | 'none';
  altitude?: number; // meters
}

export interface TelemetryValidationResult {
  valid: boolean;
  data?: VehicleTelemetry;
  error?: string;
}

export interface TelemetryBatchValidationResult {
  valid: VehicleTelemetry[];
  rejectedCount: number;
  errors: string[];
}

export type BinaryProtocolFormat = 'json' | 'binary';

export interface GeofenceEventPayload {
  eventId: string;
  vehicleId: string;
  geofenceId: string;
  geofenceName: string;
  type: 'breach' | 'entry' | 'exit';
  timestamp: number;
  latitude: number;
  longitude: number;
  speed: number;
}

/**
 * Validates a single incoming telemetry record at the system boundary.
 * Enforces coordinate bounds, non-negative speeds, valid timestamps, and recognized status enums.
 */
export function validateTelemetry(raw: unknown): TelemetryValidationResult {
  if (!raw || typeof raw !== 'object') {
    return { valid: false, error: 'Telemetry payload must be a non-null object' };
  }

  const record = raw as Record<string, unknown>;

  // vehicleId check
  if (!record.vehicleId || typeof record.vehicleId !== 'string' || record.vehicleId.trim() === '') {
    return { valid: false, error: 'Missing or invalid vehicleId' };
  }

  // latitude check [-90, 90]
  const lat = Number(record.latitude);
  if (isNaN(lat) || !isFinite(lat) || lat < -90 || lat > 90) {
    return { valid: false, error: `Invalid latitude: ${record.latitude} (must be between -90 and 90)` };
  }

  // longitude check [-180, 180]
  const lng = Number(record.longitude);
  if (isNaN(lng) || !isFinite(lng) || lng < -180 || lng > 180) {
    return { valid: false, error: `Invalid longitude: ${record.longitude} (must be between -180 and 180)` };
  }

  // speed check (>= 0 and < 350 km/h)
  const speed = Number(record.speed);
  if (isNaN(speed) || !isFinite(speed) || speed < 0 || speed > 350) {
    return { valid: false, error: `Invalid speed: ${record.speed} km/h` };
  }

  // heading check [0, 360]
  const heading = Number(record.heading);
  if (isNaN(heading) || !isFinite(heading) || heading < 0 || heading > 360) {
    return { valid: false, error: `Invalid heading: ${record.heading} degrees` };
  }

  // timestamp check
  const ts = Number(record.timestamp);
  if (isNaN(ts) || ts <= 0) {
    return { valid: false, error: `Invalid timestamp: ${record.timestamp}` };
  }

  // status check
  const statusStr = String(record.status).toLowerCase();
  const validStatus = statusStr === 'active' || statusStr === 'idle' || statusStr === 'offline';
  const status = validStatus ? (statusStr as VehicleTelemetry['status']) : 'active';

  return {
    valid: true,
    data: {
      vehicleId: String(record.vehicleId).trim(),
      latitude: lat,
      longitude: lng,
      speed,
      heading,
      timestamp: ts,
      status,
      geofenceStatus: record.geofenceStatus as VehicleTelemetry['geofenceStatus'] || 'inside',
      altitude: record.altitude !== undefined ? Number(record.altitude) : undefined,
    },
  };
}

/**
 * Validates a batch array of telemetry records, isolating and counting rejected packets.
 */
export function validateTelemetryBatch(rawBatch: unknown): TelemetryBatchValidationResult {
  if (!Array.isArray(rawBatch)) {
    return { valid: [], rejectedCount: 1, errors: ['Batch must be an array'] };
  }

  const valid: VehicleTelemetry[] = [];
  const errors: string[] = [];
  let rejectedCount = 0;

  for (let i = 0; i < rawBatch.length; i++) {
    const res = validateTelemetry(rawBatch[i]);
    if (res.valid && res.data) {
      valid.push(res.data);
    } else {
      rejectedCount++;
      if (errors.length < 5 && res.error) {
        errors.push(`Index ${i}: ${res.error}`);
      }
    }
  }

  return { valid, rejectedCount, errors };
}
