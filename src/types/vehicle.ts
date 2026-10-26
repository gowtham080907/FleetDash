export type VehicleStatus = 'active' | 'idle' | 'offline';
export type GeofenceBreachStatus = 'inside' | 'breached' | 'clear' | 'none';

export interface Vehicle {
  id: string;
  name: string;
  driverName?: string;
  status: VehicleStatus;
  speed: number; // km/h
  heading: number; // degrees 0-360
  latitude: number;
  longitude: number;
  lastUpdated: number; // timestamp ms
  geofenceStatus: GeofenceBreachStatus;
  currentGeofence?: string;
  fuelLevel?: number; // percentage 0-100
  batteryLevel?: number; // percentage 0-100
  model?: string;
  odometer?: number; // km
}

export interface FleetStats {
  totalVehicles: number;
  activeVehicles: number;
  idleVehicles: number;
  offlineVehicles: number;
  activeAlerts: number;
  eventsPerSecond: number;
  averageSpeed: number; // km/h
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
  lastIngestionTime: number;
}

export interface SpeedBin {
  range: string;
  count: number;
}

export interface StatusDistribution {
  name: string;
  value: number;
  color: string;
}

export interface ThroughputPoint {
  time: string;
  events: number;
  bytesKb: number;
}

export interface ActivityPoint {
  time: string;
  active: number;
  idle: number;
  offline: number;
}

export interface AlertSeverityPoint {
  severity: 'critical' | 'warning' | 'info';
  count: number;
  color: string;
}

export interface DashboardAnalytics {
  statusDistribution: StatusDistribution[];
  activityTrends: ActivityPoint[];
  throughputHistory: ThroughputPoint[];
  speedDistribution: SpeedBin[];
  alertBreakdown: AlertSeverityPoint[];
}

export interface VehicleFilterParams {
  search?: string;
  status?: VehicleStatus | 'all';
  geofenceStatus?: GeofenceBreachStatus | 'all';
  sortBy?: 'id' | 'name' | 'speed' | 'status' | 'lastUpdated';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface PaginatedVehicles {
  items: Vehicle[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
