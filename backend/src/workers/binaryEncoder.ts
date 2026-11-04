import { RawCoordinatePoint, RejectedPoint } from '../types/telemetry';

export const BINARY_RECORD_SIZE = 32;
export const PROTOCOL_MAGIC_BYTE = 0xFD;
export const PROTOCOL_VERSION_1 = 0x01;
export const BASE_EPOCH_MS = 1704067200000; // Jan 1, 2024 00:00:00 UTC

export const STATUS_TO_CODE: Record<string, number> = {
  active: 0,
  idle: 1,
  offline: 2,
};

export const CODE_TO_STATUS: Record<number, 'active' | 'idle' | 'offline'> = {
  0: 'active',
  1: 'idle',
  2: 'offline',
};

export const GEOFENCE_TO_CODE: Record<string, number> = {
  inside: 0,
  breached: 1,
  clear: 2,
  none: 3,
};

export const CODE_TO_GEOFENCE: Record<number, 'inside' | 'breached' | 'clear' | 'none'> = {
  0: 'inside',
  1: 'breached',
  2: 'clear',
  3: 'none',
};

export interface EncodeBatchResult {
  buffer: ArrayBuffer;
  validCount: number;
  rejected: RejectedPoint[];
  validRecords: RawCoordinatePoint[];
}

export interface DecodedTelemetryRecord {
  vehicleId: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  timestamp: number;
  status: 'active' | 'idle' | 'offline';
  geofenceStatus: 'inside' | 'breached' | 'clear' | 'none';
}

export interface DecodeBatchResult {
  records: DecodedTelemetryRecord[];
  rejectedCount: number;
  error?: string;
}

/**
 * Validates whether a raw record can be safely encoded into the 32-byte binary format.
 */
export function validateForEncoding(point: unknown): { valid: true; record: RawCoordinatePoint } | { valid: false; reason: string } {
  if (!point || typeof point !== 'object' || Array.isArray(point)) {
    return { valid: false, reason: 'Record must be a non-null object' };
  }

  const p = point as Record<string, unknown>;

  if (typeof p.vehicleId !== 'string' || p.vehicleId.trim() === '') {
    return { valid: false, reason: 'Missing or invalid vehicleId' };
  }

  const lat = Number(p.latitude);
  if (isNaN(lat) || !isFinite(lat) || lat < -90 || lat > 90) {
    return { valid: false, reason: `Invalid latitude: ${String(p.latitude)} (must be between -90 and 90)` };
  }

  const lng = Number(p.longitude);
  if (isNaN(lng) || !isFinite(lng) || lng < -180 || lng > 180) {
    return { valid: false, reason: `Invalid longitude: ${String(p.longitude)} (must be between -180 and 180)` };
  }

  const speed = p.speed !== undefined ? Number(p.speed) : 0;
  if (isNaN(speed) || !isFinite(speed) || speed < 0 || speed > 350) {
    return { valid: false, reason: `Invalid speed: ${String(p.speed)} km/h (must be 0-350)` };
  }

  const heading = p.heading !== undefined ? Number(p.heading) : 0;
  if (isNaN(heading) || !isFinite(heading) || heading < 0 || heading > 360) {
    return { valid: false, reason: `Invalid heading: ${String(p.heading)} degrees (must be 0-360)` };
  }

  const ts = p.timestamp !== undefined ? Number(p.timestamp) : Date.now();
  if (isNaN(ts) || ts <= 0) {
    return { valid: false, reason: `Invalid timestamp: ${String(p.timestamp)}` };
  }

  const statusStr = typeof p.status === 'string' ? p.status.toLowerCase() : 'active';
  const status = statusStr in STATUS_TO_CODE ? statusStr : 'active';

  const geofenceStr = typeof p.geofenceStatus === 'string' ? p.geofenceStatus.toLowerCase() : 'inside';
  const geofenceStatus = geofenceStr in GEOFENCE_TO_CODE ? geofenceStr : 'inside';

  return {
    valid: true,
    record: {
      vehicleId: p.vehicleId.trim(),
      latitude: lat,
      longitude: lng,
      speed,
      heading,
      timestamp: ts,
      status,
      geofenceStatus,
    },
  };
}

/**
 * Encodes an array of raw telemetry points into a contiguous 32-byte-per-record ArrayBuffer.
 * Invalid points are isolated into `rejected` with their original array indices.
 */
export function encodeTelemetryBatch(records: unknown[]): EncodeBatchResult {
  if (!Array.isArray(records) || records.length === 0) {
    return {
      buffer: new ArrayBuffer(0),
      validCount: 0,
      rejected: [],
      validRecords: [],
    };
  }

  const validItems: { record: RawCoordinatePoint; index: number }[] = [];
  const rejected: RejectedPoint[] = [];

  for (let i = 0; i < records.length; i++) {
    const validated = validateForEncoding(records[i]);
    if (validated.valid) {
      validItems.push({ record: validated.record, index: i });
    } else {
      rejected.push({
        index: i,
        reason: validated.reason,
      });
    }
  }

  const validCount = validItems.length;
  const buffer = new ArrayBuffer(validCount * BINARY_RECORD_SIZE);
  const view = new DataView(buffer);
  const validRecords: RawCoordinatePoint[] = [];

  for (let i = 0; i < validCount; i++) {
    const { record: r } = validItems[i]!;
    validRecords.push(r);
    const offset = i * BINARY_RECORD_SIZE;

    // Parse numeric ID (e.g. "VH-1001" -> 1001, "123" -> 123)
    const digitsOnly = r.vehicleId.replace(/\D/g, '');
    const numId = (parseInt(digitsOnly, 10) || i + 1) >>> 0; // Uint32 bounds

    const statusCode = STATUS_TO_CODE[r.status || 'active'] ?? 0;
    const geofenceCode = GEOFENCE_TO_CODE[r.geofenceStatus || 'inside'] ?? 0;

    // Header (4 bytes)
    view.setUint8(offset + 0, PROTOCOL_MAGIC_BYTE);
    view.setUint8(offset + 1, PROTOCOL_VERSION_1);
    view.setUint8(offset + 2, statusCode);
    view.setUint8(offset + 3, geofenceCode);

    // Payload (28 bytes, Little Endian: true)
    view.setUint32(offset + 4, numId, true);
    view.setFloat64(offset + 8, r.latitude, true);
    view.setFloat64(offset + 16, r.longitude, true);
    view.setUint16(offset + 24, Math.round(r.speed! * 10), true);
    view.setUint16(offset + 26, Math.round(r.heading! * 10), true);

    const relTs = Math.max(0, r.timestamp! - BASE_EPOCH_MS);
    view.setUint32(offset + 28, (relTs % 0xFFFFFFFF) >>> 0, true);
  }

  return {
    buffer,
    validCount,
    rejected,
    validRecords,
  };
}

/**
 * Decodes an ArrayBuffer or Buffer according to the FleetDash 32-byte binary protocol.
 * Mirrors the frontend decoder in src/services/telemetry/binaryDecoder.ts.
 */
export function decodeTelemetryBatch(data: ArrayBuffer | Buffer): DecodeBatchResult {
  if (!data || (!Buffer.isBuffer(data) && !(data instanceof ArrayBuffer))) {
    return { records: [], rejectedCount: 1, error: 'Expected ArrayBuffer or Buffer payload' };
  }

  const byteLength = data.byteLength;
  if (byteLength === 0) {
    return { records: [], rejectedCount: 0 };
  }

  if (byteLength % BINARY_RECORD_SIZE !== 0) {
    return {
      records: [],
      rejectedCount: Math.ceil(byteLength / BINARY_RECORD_SIZE),
      error: `Invalid binary payload length: ${byteLength} bytes (must be multiple of ${BINARY_RECORD_SIZE})`,
    };
  }

  const recordCount = byteLength / BINARY_RECORD_SIZE;
  const view = Buffer.isBuffer(data)
    ? new DataView(data.buffer, data.byteOffset, data.byteLength)
    : new DataView(data);
  const records: DecodedTelemetryRecord[] = [];
  let rejectedCount = 0;

  for (let i = 0; i < recordCount; i++) {
    const offset = i * BINARY_RECORD_SIZE;

    const magic = view.getUint8(offset + 0);
    const version = view.getUint8(offset + 1);

    if (magic !== PROTOCOL_MAGIC_BYTE || version !== PROTOCOL_VERSION_1) {
      rejectedCount++;
      continue;
    }

    const statusCode = view.getUint8(offset + 2);
    const geofenceCode = view.getUint8(offset + 3);
    const numericId = view.getUint32(offset + 4, true);
    const latitude = view.getFloat64(offset + 8, true);
    const longitude = view.getFloat64(offset + 16, true);
    const rawSpeed = view.getUint16(offset + 24, true);
    const rawHeading = view.getUint16(offset + 26, true);
    const relTimestamp = view.getUint32(offset + 28, true);

    if (
      isNaN(latitude) || latitude < -90 || latitude > 90 ||
      isNaN(longitude) || longitude < -180 || longitude > 180
    ) {
      rejectedCount++;
      continue;
    }

    records.push({
      vehicleId: `VH-${numericId}`,
      latitude,
      longitude,
      speed: Number((rawSpeed / 10).toFixed(1)),
      heading: Number((rawHeading / 10).toFixed(1)),
      timestamp: BASE_EPOCH_MS + relTimestamp,
      status: CODE_TO_STATUS[statusCode] || 'active',
      geofenceStatus: CODE_TO_GEOFENCE[geofenceCode] || 'inside',
    });
  }

  return { records, rejectedCount };
}
