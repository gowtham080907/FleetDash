import { describe, it, expect } from 'vitest';
import {
  encodeTelemetryBatch,
  decodeTelemetryBatch,
  validateForEncoding,
  BINARY_RECORD_SIZE,
  PROTOCOL_MAGIC_BYTE,
  PROTOCOL_VERSION_1,
  BASE_EPOCH_MS,
  STATUS_TO_CODE,
  GEOFENCE_TO_CODE,
} from '../../src/workers/binaryEncoder';
import { RawCoordinatePoint } from '../../src/types/telemetry';

describe('Binary Telemetry Encoder & Decoder Unit Tests', () => {
  it('correctly validates valid records and rejects out-of-bounds records', () => {
    const validPoint: RawCoordinatePoint = {
      vehicleId: 'VH-1001',
      latitude: 17.385044,
      longitude: 78.486671,
      speed: 68.4,
      heading: 182.5,
      timestamp: 1704067200000,
      status: 'active',
      geofenceStatus: 'inside',
    };

    const res = validateForEncoding(validPoint);
    expect(res.valid).toBe(true);

    // Latitude out of range
    const badLat = validateForEncoding({ ...validPoint, latitude: 95.0 });
    expect(badLat.valid).toBe(false);

    // Longitude out of range
    const badLng = validateForEncoding({ ...validPoint, longitude: -185.0 });
    expect(badLng.valid).toBe(false);

    // Negative speed
    const badSpeed = validateForEncoding({ ...validPoint, speed: -10 });
    expect(badSpeed.valid).toBe(false);

    // Empty vehicleId
    const badId = validateForEncoding({ ...validPoint, vehicleId: '   ' });
    expect(badId.valid).toBe(false);
  });

  it('verifies exact 32-byte layout and little-endian byte ordering matching frontend spec', () => {
    const record: RawCoordinatePoint = {
      vehicleId: 'VH-1001',
      latitude: 17.385,
      longitude: 78.486,
      speed: 60.5,
      heading: 180.0,
      timestamp: BASE_EPOCH_MS + 1000,
      status: 'idle',
      geofenceStatus: 'breached',
    };

    const { buffer, validCount } = encodeTelemetryBatch([record]);
    expect(validCount).toBe(1);
    expect(buffer.byteLength).toBe(BINARY_RECORD_SIZE);

    const view = new DataView(buffer);

    // Byte 0: Magic byte (0xFD)
    expect(view.getUint8(0)).toBe(PROTOCOL_MAGIC_BYTE);
    expect(view.getUint8(0)).toBe(0xFD);

    // Byte 1: Protocol version (0x01)
    expect(view.getUint8(1)).toBe(PROTOCOL_VERSION_1);
    expect(view.getUint8(1)).toBe(0x01);

    // Byte 2: Status code (idle = 1)
    expect(view.getUint8(2)).toBe(STATUS_TO_CODE.idle);
    expect(view.getUint8(2)).toBe(1);

    // Byte 3: Geofence code (breached = 1)
    expect(view.getUint8(3)).toBe(GEOFENCE_TO_CODE.breached);
    expect(view.getUint8(3)).toBe(1);

    // Bytes 4-7: Numeric vehicleId (1001 Uint32 LE)
    expect(view.getUint32(4, true)).toBe(1001);

    // Bytes 8-15: Latitude (Float64 LE)
    expect(view.getFloat64(8, true)).toBeCloseTo(17.385, 5);

    // Bytes 16-23: Longitude (Float64 LE)
    expect(view.getFloat64(16, true)).toBeCloseTo(78.486, 5);

    // Bytes 24-25: Speed * 10 (60.5 * 10 = 605 Uint16 LE)
    expect(view.getUint16(24, true)).toBe(605);

    // Bytes 26-27: Heading * 10 (180.0 * 10 = 1800 Uint16 LE)
    expect(view.getUint16(26, true)).toBe(1800);

    // Bytes 28-31: Relative milliseconds from base epoch (1000 Uint32 LE)
    expect(view.getUint32(28, true)).toBe(1000);
  });

  it('performs lossless round-trip encoding and decoding across multiple records', () => {
    const records: RawCoordinatePoint[] = [
      {
        vehicleId: 'VH-101',
        latitude: 17.385,
        longitude: 78.486,
        speed: 45.2,
        heading: 90.0,
        timestamp: BASE_EPOCH_MS + 5000,
        status: 'active',
        geofenceStatus: 'inside',
      },
      {
        vehicleId: 'VH-202',
        latitude: -33.8688,
        longitude: 151.2093,
        speed: 110.0,
        heading: 270.5,
        timestamp: BASE_EPOCH_MS + 10000,
        status: 'offline',
        geofenceStatus: 'clear',
      },
    ];

    const encoded = encodeTelemetryBatch(records);
    expect(encoded.validCount).toBe(2);
    expect(encoded.rejected.length).toBe(0);
    expect(encoded.buffer.byteLength).toBe(2 * BINARY_RECORD_SIZE);

    const decoded = decodeTelemetryBatch(encoded.buffer);
    expect(decoded.records.length).toBe(2);
    expect(decoded.rejectedCount).toBe(0);

    expect(decoded.records[0]!.vehicleId).toBe('VH-101');
    expect(decoded.records[0]!.latitude).toBeCloseTo(17.385, 4);
    expect(decoded.records[0]!.longitude).toBeCloseTo(78.486, 4);
    expect(decoded.records[0]!.speed).toBe(45.2);
    expect(decoded.records[0]!.heading).toBe(90.0);
    expect(decoded.records[0]!.timestamp).toBe(BASE_EPOCH_MS + 5000);
    expect(decoded.records[0]!.status).toBe('active');
    expect(decoded.records[0]!.geofenceStatus).toBe('inside');

    expect(decoded.records[1]!.vehicleId).toBe('VH-202');
    expect(decoded.records[1]!.latitude).toBeCloseTo(-33.8688, 4);
    expect(decoded.records[1]!.longitude).toBeCloseTo(151.2093, 4);
    expect(decoded.records[1]!.speed).toBe(110.0);
    expect(decoded.records[1]!.heading).toBe(270.5);
    expect(decoded.records[1]!.status).toBe('offline');
    expect(decoded.records[1]!.geofenceStatus).toBe('clear');
  });

  it('isolates invalid records with original indices in mixed batch', () => {
    const mixed = [
      { vehicleId: 'VH-1', latitude: 10, longitude: 20 },
      { vehicleId: 'VH-2', latitude: 200, longitude: 20 }, // Bad lat
      { vehicleId: 'VH-3', latitude: 10, longitude: 20 },
      { vehicleId: 'VH-4', latitude: 10, longitude: -250 }, // Bad lng
    ];

    const result = encodeTelemetryBatch(mixed);
    expect(result.validCount).toBe(2);
    expect(result.rejected.length).toBe(2);
    expect(result.rejected[0]!.index).toBe(1);
    expect(result.rejected[1]!.index).toBe(3);
    expect(result.buffer.byteLength).toBe(2 * BINARY_RECORD_SIZE);
  });

  it('rejects corrupt payloads with invalid magic byte or length in decoder', () => {
    // Bad length
    const badLengthBuf = new ArrayBuffer(50);
    const res1 = decodeTelemetryBatch(badLengthBuf);
    expect(res1.records.length).toBe(0);
    expect(res1.rejectedCount).toBeGreaterThan(0);

    // Bad magic byte
    const fakeRecord = new ArrayBuffer(32);
    const view = new DataView(fakeRecord);
    view.setUint8(0, 0xEE); // Wrong magic
    view.setUint8(1, 0x01);
    const res2 = decodeTelemetryBatch(fakeRecord);
    expect(res2.records.length).toBe(0);
    expect(res2.rejectedCount).toBe(1);
  });
});
