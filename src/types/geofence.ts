export type GeofenceShapeType = 'circle' | 'polygon';

export interface GeofenceZone {
  id: string;
  name: string;
  type: GeofenceShapeType;
  center?: [number, number]; // [lat, lng] for circle
  radiusMeters?: number; // meters for circle
  coordinates?: [number, number][]; // [[lat, lng], ...] for polygon
  color: string;
  fillOpacity: number;
  speedLimitKmH: number;
  description?: string;
  visible: boolean;
  activeVehiclesCount: number;
  breachCount: number;
}

export interface GeofenceAlert {
  id: string;
  vehicleId: string;
  geofenceId: string;
  geofenceName: string;
  type: 'breach' | 'entry' | 'exit';
  severity: 'critical' | 'warning' | 'info';
  timestamp: number;
  latitude: number;
  longitude: number;
  speed: number;
  acknowledged: boolean;
}
