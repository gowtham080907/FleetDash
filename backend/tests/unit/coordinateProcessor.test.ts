import { describe, it, expect } from 'vitest';
import {
  validateCoordinatePoint,
  processCoordinateBatch,
} from '../../src/workers/coordinateProcessor';
import { RawCoordinatePoint } from '../../src/types/telemetry';

describe('Coordinate Processor Unit Tests', () => {
  describe('validateCoordinatePoint', () => {
    it('accepts a valid coordinate point with required fields', () => {
      const point = {
        vehicleId: 'VH-1001',
        latitude: 17.385044,
        longitude: 78.486671,
      };
      const result = validateCoordinatePoint(point);
      expect(result.valid).toBe(true);
    });

    it('accepts boundary latitude values: -90 and +90', () => {
      expect(
        validateCoordinatePoint({ vehicleId: 'V1', latitude: -90, longitude: 0 }).valid
      ).toBe(true);
      expect(
        validateCoordinatePoint({ vehicleId: 'V2', latitude: 90, longitude: 0 }).valid
      ).toBe(true);
    });

    it('accepts boundary longitude values: -180 and +180', () => {
      expect(
        validateCoordinatePoint({ vehicleId: 'V1', latitude: 0, longitude: -180 }).valid
      ).toBe(true);
      expect(
        validateCoordinatePoint({ vehicleId: 'V2', latitude: 0, longitude: 180 }).valid
      ).toBe(true);
    });

    it('rejects out-of-range latitude (> 90 or < -90)', () => {
      const resHigh = validateCoordinatePoint({ vehicleId: 'V1', latitude: 90.0001, longitude: 50 });
      expect(resHigh.valid).toBe(false);
      if (!resHigh.valid) {
        expect(resHigh.reason).toContain('Latitude out of range');
      }

      const resLow = validateCoordinatePoint({ vehicleId: 'V1', latitude: -90.0001, longitude: 50 });
      expect(resLow.valid).toBe(false);
      if (!resLow.valid) {
        expect(resLow.reason).toContain('Latitude out of range');
      }
    });

    it('rejects out-of-range longitude (> 180 or < -180)', () => {
      const resHigh = validateCoordinatePoint({ vehicleId: 'V1', latitude: 20, longitude: 180.0001 });
      expect(resHigh.valid).toBe(false);
      if (!resHigh.valid) {
        expect(resHigh.reason).toContain('Longitude out of range');
      }

      const resLow = validateCoordinatePoint({ vehicleId: 'V1', latitude: 20, longitude: -180.0001 });
      expect(resLow.valid).toBe(false);
      if (!resLow.valid) {
        expect(resLow.reason).toContain('Longitude out of range');
      }
    });

    it('rejects NaN and Infinity coordinates', () => {
      expect(
        validateCoordinatePoint({ vehicleId: 'V1', latitude: NaN, longitude: 78 }).valid
      ).toBe(false);
      expect(
        validateCoordinatePoint({ vehicleId: 'V1', latitude: 17, longitude: Infinity }).valid
      ).toBe(false);
      expect(
        validateCoordinatePoint({ vehicleId: 'V1', latitude: -Infinity, longitude: 78 }).valid
      ).toBe(false);
    });

    it('rejects string coordinates (strict numeric type enforcement)', () => {
      const res = validateCoordinatePoint({ vehicleId: 'V1', latitude: '17.385', longitude: 78.486 });
      expect(res.valid).toBe(false);
      if (!res.valid) {
        expect(res.reason).toContain('must be a finite number');
      }
    });

    it('rejects null, undefined, or missing coordinates', () => {
      expect(validateCoordinatePoint({ vehicleId: 'V1', latitude: null, longitude: 78 }).valid).toBe(false);
      expect(validateCoordinatePoint({ vehicleId: 'V1', latitude: 17, longitude: undefined }).valid).toBe(false);
      expect(validateCoordinatePoint({ vehicleId: 'V1' }).valid).toBe(false);
    });

    it('rejects missing or empty vehicleId', () => {
      expect(validateCoordinatePoint({ latitude: 17, longitude: 78 }).valid).toBe(false);
      expect(validateCoordinatePoint({ vehicleId: '', latitude: 17, longitude: 78 }).valid).toBe(false);
      expect(validateCoordinatePoint({ vehicleId: '   ', latitude: 17, longitude: 78 }).valid).toBe(false);
    });

    it('rejects non-object or null input', () => {
      expect(validateCoordinatePoint(null).valid).toBe(false);
      expect(validateCoordinatePoint(undefined).valid).toBe(false);
      expect(validateCoordinatePoint('string').valid).toBe(false);
      expect(validateCoordinatePoint(123).valid).toBe(false);
      expect(validateCoordinatePoint([]).valid).toBe(false);
    });
  });

  describe('processCoordinateBatch', () => {
    it('normalizes valid coordinates to 6 decimal places and adds processedAt', () => {
      const points: RawCoordinatePoint[] = [
        {
          vehicleId: 'VH-1001',
          latitude: 17.385044999,
          longitude: 78.486671001,
          speed: 65.5,
          heading: 180,
          timestamp: 1704067200000,
          status: 'active',
        },
      ];

      const before = Date.now();
      const result = processCoordinateBatch(points);
      const after = Date.now();

      expect(result.stats.received).toBe(1);
      expect(result.stats.valid).toBe(1);
      expect(result.stats.invalid).toBe(0);
      expect(result.processed).toHaveLength(1);
      expect(result.rejected).toHaveLength(0);

      const processed = result.processed[0]!;
      expect(processed.latitude).toBe(17.385045);
      expect(processed.longitude).toBe(78.486671);
      expect(processed.speed).toBe(65.5);
      expect(processed.heading).toBe(180);
      expect(processed.vehicleId).toBe('VH-1001');
      expect(processed.processedAt).toBeGreaterThanOrEqual(before);
      expect(processed.processedAt).toBeLessThanOrEqual(after);
    });

    it('preserves array indices for rejected points in a mixed batch', () => {
      const points: RawCoordinatePoint[] = [
        { vehicleId: 'V0-valid', latitude: 10, longitude: 20 },
        { vehicleId: 'V1-invalid-lat', latitude: 100, longitude: 20 }, // index 1
        { vehicleId: 'V2-valid', latitude: 30, longitude: 40 },
        { vehicleId: 'V3-invalid-lon', latitude: 30, longitude: 200 }, // index 3
        { vehicleId: 'V4-valid', latitude: -90, longitude: 180 },
      ];

      const result = processCoordinateBatch(points);

      expect(result.stats.received).toBe(5);
      expect(result.stats.valid).toBe(3);
      expect(result.stats.invalid).toBe(2);

      expect(result.processed.map((p) => p.vehicleId)).toEqual(['V0-valid', 'V2-valid', 'V4-valid']);

      expect(result.rejected).toHaveLength(2);
      expect(result.rejected[0]!.index).toBe(1);
      expect(result.rejected[0]!.reason).toContain('Latitude out of range');
      expect(result.rejected[1]!.index).toBe(3);
      expect(result.rejected[1]!.reason).toContain('Longitude out of range');
    });

    it('handles an empty array cleanly', () => {
      const result = processCoordinateBatch([]);
      expect(result.stats.received).toBe(0);
      expect(result.stats.valid).toBe(0);
      expect(result.stats.invalid).toBe(0);
      expect(result.processed).toEqual([]);
      expect(result.rejected).toEqual([]);
      expect(result.stats.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('handles all-invalid batch without throwing or dropping information', () => {
      const points: RawCoordinatePoint[] = [
        { vehicleId: 'V1', latitude: 999, longitude: 0 },
        { vehicleId: 'V2', latitude: 0, longitude: 999 },
      ];
      const result = processCoordinateBatch(points);
      expect(result.stats.received).toBe(2);
      expect(result.stats.valid).toBe(0);
      expect(result.stats.invalid).toBe(2);
      expect(result.processed).toHaveLength(0);
      expect(result.rejected).toHaveLength(2);
      expect(result.rejected[0]!.index).toBe(0);
      expect(result.rejected[1]!.index).toBe(1);
    });
  });
});
