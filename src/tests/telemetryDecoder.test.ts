import { describe, it, expect } from 'vitest';
import { validateTelemetry, validateTelemetryBatch, VehicleTelemetry } from '../types/telemetry';
import { encodeBinaryBatch, decodeBinaryBatch, BINARY_RECORD_SIZE } from '../services/telemetry/binaryDecoder';

describe('Telemetry Decoder & Boundary Validator', () => {
  it('accepts valid telemetry objects', () => {
    const raw = {
      vehicleId: 'VH-1001',
      latitude: 41.8781,
      longitude: -87.6298,
      speed: 65.5,
      heading: 180,
      timestamp: Date.now(),
      status: 'active',
    };

    const res = validateTelemetry(raw);
    expect(res.valid).toBe(true);
    expect(res.data?.vehicleId).toBe('VH-1001');
    expect(res.data?.latitude).toBe(41.8781);
    expect(res.data?.speed).toBe(65.5);
  });

  it('rejects out-of-bound coordinates', () => {
    const invalidLat = validateTelemetry({
      vehicleId: 'VH-1002',
      latitude: 105.0, // Invalid > 90
      longitude: -87.0,
      speed: 50,
      heading: 0,
      timestamp: Date.now(),
      status: 'active',
    });
    expect(invalidLat.valid).toBe(false);
    expect(invalidLat.error).toContain('Invalid latitude');

    const invalidLng = validateTelemetry({
      vehicleId: 'VH-1002',
      latitude: 41.0,
      longitude: -195.0, // Invalid < -180
      speed: 50,
      heading: 0,
      timestamp: Date.now(),
      status: 'active',
    });
    expect(invalidLng.valid).toBe(false);
    expect(invalidLng.error).toContain('Invalid longitude');
  });

  it('rejects negative speeds and NaN values', () => {
    const negSpeed = validateTelemetry({
      vehicleId: 'VH-1003',
      latitude: 41.0,
      longitude: -87.0,
      speed: -25,
      heading: 0,
      timestamp: Date.now(),
      status: 'active',
    });
    expect(negSpeed.valid).toBe(false);
    expect(negSpeed.error).toContain('Invalid speed');
  });

  it('validates batches and isolates rejected records', () => {
    const batch = [
      { vehicleId: 'VH-1', latitude: 41.0, longitude: -87.0, speed: 50, heading: 0, timestamp: 1000, status: 'active' },
      { vehicleId: '', latitude: 41.0, longitude: -87.0, speed: 50, heading: 0, timestamp: 1000, status: 'active' }, // Invalid ID
      { vehicleId: 'VH-3', latitude: 41.0, longitude: -87.0, speed: 50, heading: 0, timestamp: 1000, status: 'active' },
    ];

    const result = validateTelemetryBatch(batch);
    expect(result.valid.length).toBe(2);
    expect(result.rejectedCount).toBe(1);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('encodes and decodes binary ArrayBuffer packets with fidelity', () => {
    const sample: VehicleTelemetry[] = [
      {
        vehicleId: 'VH-1001',
        latitude: 41.8781,
        longitude: -87.6298,
        speed: 55.4,
        heading: 270.5,
        timestamp: 1704067250000,
        status: 'active',
        geofenceStatus: 'inside',
      },
      {
        vehicleId: 'VH-1002',
        latitude: 41.9000,
        longitude: -87.7000,
        speed: 0,
        heading: 90,
        timestamp: 1704067260000,
        status: 'idle',
        geofenceStatus: 'breached',
      },
    ];

    const buffer = encodeBinaryBatch(sample);
    expect(buffer.byteLength).toBe(2 * BINARY_RECORD_SIZE);

    const decoded = decodeBinaryBatch(buffer);
    expect(decoded.rejectedCount).toBe(0);
    expect(decoded.records.length).toBe(2);

    expect(decoded.records[0].vehicleId).toBe('VH-1001');
    expect(decoded.records[0].latitude).toBeCloseTo(41.8781, 4);
    expect(decoded.records[0].longitude).toBeCloseTo(-87.6298, 4);
    expect(decoded.records[0].speed).toBe(55.4);
    expect(decoded.records[0].heading).toBe(270.5);
    expect(decoded.records[0].status).toBe('active');
    expect(decoded.records[0].geofenceStatus).toBe('inside');

    expect(decoded.records[1].vehicleId).toBe('VH-1002');
    expect(decoded.records[1].status).toBe('idle');
    expect(decoded.records[1].geofenceStatus).toBe('breached');
  });

  it('rejects malformed binary buffers with incorrect byte length', () => {
    const malformed = new ArrayBuffer(25); // Not multiple of 32
    const res = decodeBinaryBatch(malformed);
    expect(res.records.length).toBe(0);
    expect(res.rejectedCount).toBeGreaterThan(0);
    expect(res.error).toContain('Invalid binary payload length');
  });
});
