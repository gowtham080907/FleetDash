import { VehicleTelemetry } from '@/types/telemetry';

export const BINARY_RECORD_SIZE = 32; // 32 bytes per vehicle record
export const PROTOCOL_MAGIC_BYTE = 0xFD; // FleetDash identifier
export const PROTOCOL_VERSION_1 = 0x01; // Version 1.0

// Base epoch offset for 32-bit millisecond offsets (Jan 1, 2024 00:00:00 UTC)
const BASE_EPOCH_MS = 1704067200000;

const STATUS_MAP: Record<number, VehicleTelemetry['status']> = {
  0: 'active',
  1: 'idle',
  2: 'offline',
};

const REVERSE_STATUS_MAP: Record<VehicleTelemetry['status'], number> = {
  active: 0,
  idle: 1,
  offline: 2,
};

const GEOFENCE_MAP: Record<number, NonNullable<VehicleTelemetry['geofenceStatus']>> = {
  0: 'inside',
  1: 'breached',
  2: 'clear',
  3: 'none',
};

const REVERSE_GEOFENCE_MAP: Record<NonNullable<VehicleTelemetry['geofenceStatus']>, number> = {
  inside: 0,
  breached: 1,
  clear: 2,
  none: 3,
};

export interface BinaryDecodeResult {
  records: VehicleTelemetry[];
  rejectedCount: number;
  error?: string;
}

/**
 * Encodes an array of VehicleTelemetry objects into a versioned ArrayBuffer.
 * Used by the deterministic demo simulator and integration test suites.
 */
export function encodeBinaryBatch(records: VehicleTelemetry[]): ArrayBuffer {
  const buffer = new ArrayBuffer(records.length * BINARY_RECORD_SIZE);
  const view = new DataView(buffer);

  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    const offset = i * BINARY_RECORD_SIZE;

    // Extract numeric ID from format "VH-1001" or parse string
    const numId = parseInt(r.vehicleId.replace(/\D/g, ''), 10) || i + 1;

    // Header bytes
    view.setUint8(offset + 0, PROTOCOL_MAGIC_BYTE);
    view.setUint8(offset + 1, PROTOCOL_VERSION_1);
    view.setUint8(offset + 2, REVERSE_STATUS_MAP[r.status] ?? 0);
    view.setUint8(offset + 3, REVERSE_GEOFENCE_MAP[r.geofenceStatus || 'inside'] ?? 0);

    // Payload fields (Explicit Little Endian: true)
    view.setUint32(offset + 4, numId, true);
    view.setFloat64(offset + 8, r.latitude, true);
    view.setFloat64(offset + 16, r.longitude, true);
    view.setUint16(offset + 24, Math.round(r.speed * 10), true);
    view.setUint16(offset + 26, Math.round(r.heading * 10), true);

    // Timestamp as relative milliseconds from base epoch
    const relTs = Math.max(0, r.timestamp - BASE_EPOCH_MS);
    view.setUint32(offset + 28, relTs % 0xFFFFFFFF, true);
  }

  return buffer;
}

/**
 * Decodes a raw binary ArrayBuffer payload into strongly typed VehicleTelemetry array.
 * Validates magic byte, protocol version, boundary lengths, and field offsets.
 */
export function decodeBinaryBatch(buffer: ArrayBuffer): BinaryDecodeResult {
  if (!buffer || !(buffer instanceof ArrayBuffer)) {
    return { records: [], rejectedCount: 1, error: 'Expected valid ArrayBuffer payload' };
  }

  const byteLength = buffer.byteLength;
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
  const view = new DataView(buffer);
  const records: VehicleTelemetry[] = [];
  let rejectedCount = 0;

  for (let i = 0; i < recordCount; i++) {
    const offset = i * BINARY_RECORD_SIZE;

    const magic = view.getUint8(offset + 0);
    const version = view.getUint8(offset + 1);

    // Malformed packet check: Magic byte and version validation
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

    // Sanity checks on parsed values
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
      status: STATUS_MAP[statusCode] || 'active',
      geofenceStatus: GEOFENCE_MAP[geofenceCode] || 'inside',
    });
  }

  return { records, rejectedCount };
}
