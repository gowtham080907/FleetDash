import { GeofenceZone, GeofenceAlert, GeofenceEventPayload } from '../types/geofence';
import { db } from '../db/database';
import { getSocketServer } from '../socket/socketServer';

export interface GeofenceEvaluationResult {
  insideGeofences: GeofenceZone[];
  breachedGeofences: GeofenceZone[];
  status: 'inside' | 'breached' | 'clear' | 'none';
  currentGeofenceName?: string;
  alertsGenerated: GeofenceAlert[];
}

export class GeofenceService {
  // Track previous geofence per vehicle to identify state transitions (entry, exit)
  private vehicleGeofenceState = new Map<
    string,
    {
      geofenceIds: Set<string>;
      lastBreachTime: number;
    }
  >();

  /**
   * Earth's mean radius in meters.
   */
  private readonly EARTH_RADIUS_METERS = 6371000;

  /**
   * Calculates Haversine distance between two coordinates in meters.
   */
  public calculateDistanceMeters(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return this.EARTH_RADIUS_METERS * c;
  }

  /**
   * Circular geofence boundary test.
   */
  public isPointInCircle(
    lat: number,
    lon: number,
    centerLat: number,
    centerLon: number,
    radiusMeters: number
  ): boolean {
    const dist = this.calculateDistanceMeters(lat, lon, centerLat, centerLon);
    return dist <= radiusMeters;
  }

  /**
   * Polygon geofence boundary test using the Ray-Casting algorithm.
   * Coordinate format: [latitude, longitude]
   */
  public isPointInPolygon(
    lat: number,
    lon: number,
    polygon: [number, number][]
  ): boolean {
    if (!polygon || polygon.length < 3) return false;

    let inside = false;
    const n = polygon.length;

    for (let i = 0, j = n - 1; i < n; j = i++) {
      const pi = polygon[i];
      const pj = polygon[j];
      if (!pi || !pj) continue;
      const [xi, yi] = pi;
      const [xj, yj] = pj;

      // Check if ray from (lat, lon) intersects edge (i, j)
      const intersect =
        yi > lon !== yj > lon &&
        lat < ((xj - xi) * (lon - yi)) / (yj - yi) + xi;

      if (intersect) {
        inside = !inside;
      }
    }

    return inside;
  }

  /**
   * Checks whether a coordinate point is inside a given geofence zone.
   */
  public isPointInsideZone(lat: number, lon: number, zone: GeofenceZone): boolean {
    if (zone.type === 'circle' && zone.center && zone.radiusMeters) {
      return this.isPointInCircle(lat, lon, zone.center[0], zone.center[1], zone.radiusMeters);
    }

    if (zone.type === 'polygon' && zone.coordinates && zone.coordinates.length >= 3) {
      return this.isPointInPolygon(lat, lon, zone.coordinates);
    }

    return false;
  }

  /**
   * Evaluates telemetry point against all registered geofences.
   * Detects breaches (e.g. exceeding speed limit inside zone), entries, and exits.
   */
  public evaluatePoint(point: {
    vehicleId: string;
    latitude: number;
    longitude: number;
    speed?: number;
    timestamp?: number;
  }): GeofenceEvaluationResult {
    const speed = point.speed || 0;
    const timestamp = point.timestamp || Date.now();
    const geofences = db.getGeofences();

    const insideGeofences: GeofenceZone[] = [];
    const breachedGeofences: GeofenceZone[] = [];
    const alertsGenerated: GeofenceAlert[] = [];

    const prevState = this.vehicleGeofenceState.get(point.vehicleId) || {
      geofenceIds: new Set<string>(),
      lastBreachTime: 0,
    };
    const currentGeofenceIds = new Set<string>();

    for (const zone of geofences) {
      const isInside = this.isPointInsideZone(point.latitude, point.longitude, zone);

      if (isInside) {
        insideGeofences.push(zone);
        currentGeofenceIds.add(zone.id);

        // Check if vehicle newly entered this zone
        if (!prevState.geofenceIds.has(zone.id)) {
          // Entry event
          const entryAlert = db.createAlert({
            vehicleId: point.vehicleId,
            geofenceId: zone.id,
            geofenceName: zone.name,
            type: 'entry',
            severity: 'info',
            timestamp,
            latitude: point.latitude,
            longitude: point.longitude,
            speed,
            acknowledged: true, // Auto-ack normal entry logs
          });
          alertsGenerated.push(entryAlert);
        }

        // Check speed limit breach inside zone
        if (zone.speedLimitKmH > 0 && speed > zone.speedLimitKmH) {
          breachedGeofences.push(zone);

          // Debounce alert generation to avoid spamming alerts every 50ms for same breach
          const canAlert = timestamp - prevState.lastBreachTime > 15000; // once every 15s
          if (canAlert) {
            prevState.lastBreachTime = timestamp;
            const breachAlert = db.createAlert({
              vehicleId: point.vehicleId,
              geofenceId: zone.id,
              geofenceName: zone.name,
              type: 'breach',
              severity: 'critical',
              timestamp,
              latitude: point.latitude,
              longitude: point.longitude,
              speed,
              acknowledged: false,
            });
            alertsGenerated.push(breachAlert);

            // Broadcast breach event via Socket.IO
            this.broadcastBreachEvent({
              eventId: breachAlert.id,
              vehicleId: point.vehicleId,
              geofenceId: zone.id,
              geofenceName: zone.name,
              type: 'breach',
              timestamp,
              latitude: point.latitude,
              longitude: point.longitude,
              speed,
            });
          }
        }
      } else {
        // Vehicle is not inside this zone. Did it just exit?
        if (prevState.geofenceIds.has(zone.id)) {
          const exitAlert = db.createAlert({
            vehicleId: point.vehicleId,
            geofenceId: zone.id,
            geofenceName: zone.name,
            type: 'exit',
            severity: 'info',
            timestamp,
            latitude: point.latitude,
            longitude: point.longitude,
            speed,
            acknowledged: true,
          });
          alertsGenerated.push(exitAlert);
        }
      }
    }

    // Update state
    prevState.geofenceIds = currentGeofenceIds;
    this.vehicleGeofenceState.set(point.vehicleId, prevState);

    // Determine aggregate geofence status
    let status: 'inside' | 'breached' | 'clear' | 'none' = 'none';
    if (breachedGeofences.length > 0) {
      status = 'breached';
    } else if (insideGeofences.length > 0) {
      status = 'inside';
    } else {
      status = 'clear';
    }

    return {
      insideGeofences,
      breachedGeofences,
      status,
      currentGeofenceName: insideGeofences[0]?.name,
      alertsGenerated,
    };
  }

  /**
   * Broadcasts geofence breach event over Socket.IO.
   */
  private broadcastBreachEvent(payload: GeofenceEventPayload): void {
    const socketServer = getSocketServer();
    if (socketServer && socketServer.io) {
      socketServer.io.emit('geofence:breach', payload);
    }
  }

  /**
   * Recalculates zone vehicle counts and breach counts.
   */
  public updateZoneCounts(): void {
    const vehicles = db.getAllVehicles();
    const zones = db.getGeofences();

    for (const zone of zones) {
      let activeInside = 0;
      let breaches = 0;

      for (const v of vehicles) {
        if (this.isPointInsideZone(v.latitude, v.longitude, zone)) {
          if (v.status === 'active' || v.status === 'idle') {
            activeInside++;
          }
          if (v.speed > zone.speedLimitKmH) {
            breaches++;
          }
        }
      }

      db.updateGeofence(zone.id, {
        activeVehiclesCount: activeInside,
        breachCount: breaches,
      });
    }
  }
}

export const geofenceService = new GeofenceService();
