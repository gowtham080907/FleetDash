import fs from 'fs';
import path from 'path';
import { config } from '../config/env';
import { Vehicle, VehicleFilterParams, PaginatedVehicles, FleetStats, DashboardAnalytics, TelemetryBreadcrumb } from '../types/vehicle';
import { GeofenceZone, GeofenceAlert } from '../types/geofence';
import { UserRecord, User } from '../types/auth';
import { getSeedVehicles, SEED_GEOFENCES, SEED_ALERTS, getSeedUsers } from './seed';

interface DatabaseSchema {
  vehicles: Vehicle[];
  geofences: GeofenceZone[];
  alerts: GeofenceAlert[];
  users: UserRecord[];
  history: Record<string, TelemetryBreadcrumb[]>;
}

export class Database {
  private vehicles = new Map<string, Vehicle>();
  private geofences = new Map<string, GeofenceZone>();
  private alerts: GeofenceAlert[] = [];
  private users = new Map<string, UserRecord>();
  private history = new Map<string, TelemetryBreadcrumb[]>();

  private storageFile: string;
  private isInitialized = false;
  private saveDebounceTimeout: NodeJS.Timeout | null = null;

  constructor(dataDir = config.DATA_DIR) {
    this.storageFile = path.resolve(dataDir, 'fleetdash.json');
  }

  public async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const dir = path.dirname(this.storageFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      if (fs.existsSync(this.storageFile)) {
        const raw = fs.readFileSync(this.storageFile, 'utf-8');
        const data: DatabaseSchema = JSON.parse(raw);

        if (Array.isArray(data.vehicles)) {
          for (const v of data.vehicles) this.vehicles.set(v.id, v);
        }
        if (Array.isArray(data.geofences)) {
          for (const g of data.geofences) this.geofences.set(g.id, g);
        }
        if (Array.isArray(data.alerts)) {
          this.alerts = data.alerts;
        }
        if (Array.isArray(data.users)) {
          for (const u of data.users) this.users.set(u.id, u);
        }
        if (data.history && typeof data.history === 'object') {
          for (const [key, val] of Object.entries(data.history)) {
            this.history.set(key, val);
          }
        }
      }

      // If empty or missing, seed data
      if (this.vehicles.size === 0) {
        const seedVehicles = getSeedVehicles();
        for (const v of seedVehicles) this.vehicles.set(v.id, v);
      }

      if (this.geofences.size === 0) {
        for (const g of SEED_GEOFENCES) this.geofences.set(g.id, { ...g });
      }

      if (this.alerts.length === 0) {
        this.alerts = [...SEED_ALERTS];
      }

      if (this.users.size === 0) {
        const seedUsers = getSeedUsers();
        for (const u of seedUsers) this.users.set(u.id, u);
      }

      this.isInitialized = true;
      this.scheduleSave();
    } catch (err) {
      console.error('[Database] Failed to load data from storage, initializing with seed data:', err);
      // Fallback in-memory
      const seedVehicles = getSeedVehicles();
      for (const v of seedVehicles) this.vehicles.set(v.id, v);
      for (const g of SEED_GEOFENCES) this.geofences.set(g.id, { ...g });
      this.alerts = [...SEED_ALERTS];
      const seedUsers = getSeedUsers();
      for (const u of seedUsers) this.users.set(u.id, u);
      this.isInitialized = true;
    }
  }

  private scheduleSave(): void {
    if (this.saveDebounceTimeout) return;
    this.saveDebounceTimeout = setTimeout(() => {
      this.saveDebounceTimeout = null;
      this.persistToDisk();
    }, 1000);
  }

  private persistToDisk(): void {
    try {
      const dir = path.dirname(this.storageFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const data: DatabaseSchema = {
        vehicles: Array.from(this.vehicles.values()),
        geofences: Array.from(this.geofences.values()),
        alerts: this.alerts,
        users: Array.from(this.users.values()),
        history: Object.fromEntries(this.history.entries()),
      };

      const tmpPath = `${this.storageFile}.tmp`;
      fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tmpPath, this.storageFile);
    } catch (err) {
      console.error('[Database] Error persisting data to disk:', err);
    }
  }

  // --- VEHICLE REPOSITORY ---

  public getVehicles(params: VehicleFilterParams = {}): PaginatedVehicles {
    let result = Array.from(this.vehicles.values());

    // Search filter
    if (params.search) {
      const q = params.search.toLowerCase().trim();
      result = result.filter(
        (v) =>
          v.id.toLowerCase().includes(q) ||
          v.name.toLowerCase().includes(q) ||
          (v.driverName && v.driverName.toLowerCase().includes(q)) ||
          (v.model && v.model.toLowerCase().includes(q)) ||
          (v.currentGeofence && v.currentGeofence.toLowerCase().includes(q))
      );
    }

    // Status filter
    if (params.status && params.status !== 'all') {
      result = result.filter((v) => v.status === params.status);
    }

    // Geofence status filter
    if (params.geofenceStatus && params.geofenceStatus !== 'all') {
      result = result.filter((v) => v.geofenceStatus === params.geofenceStatus);
    }

    // Sorting
    const sortBy = params.sortBy || 'id';
    const order = params.sortOrder === 'desc' ? -1 : 1;

    result.sort((a, b) => {
      if (sortBy === 'id') return a.id.localeCompare(b.id) * order;
      if (sortBy === 'name') return a.name.localeCompare(b.name) * order;
      if (sortBy === 'speed') return (a.speed - b.speed) * order;
      if (sortBy === 'status') return a.status.localeCompare(b.status) * order;
      if (sortBy === 'lastUpdated') return (a.lastUpdated - b.lastUpdated) * order;
      return 0;
    });

    const page = Math.max(1, params.page || 1);
    const pageSize = Math.max(1, params.pageSize || 10);
    const total = result.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const startIndex = (page - 1) * pageSize;
    const items = result.slice(startIndex, startIndex + pageSize);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  public getAllVehicles(): Vehicle[] {
    return Array.from(this.vehicles.values());
  }

  public getVehicleById(id: string): Vehicle | null {
    const match = this.vehicles.get(id);
    if (match) return match;
    for (const v of this.vehicles.values()) {
      if (v.id.toLowerCase() === id.toLowerCase()) return v;
    }
    return null;
  }

  public createVehicle(vehicle: Vehicle): Vehicle {
    this.vehicles.set(vehicle.id, vehicle);
    this.scheduleSave();
    return vehicle;
  }

  public updateVehicle(id: string, updates: Partial<Vehicle>): Vehicle | null {
    const existing = this.getVehicleById(id);
    if (!existing) return null;

    const updated: Vehicle = {
      ...existing,
      ...updates,
      id: existing.id, // Preserve immutable ID
      lastUpdated: updates.lastUpdated || Date.now(),
    };

    this.vehicles.set(existing.id, updated);
    this.scheduleSave();
    return updated;
  }

  public deleteVehicle(id: string): boolean {
    const existing = this.getVehicleById(id);
    if (!existing) return false;
    const deleted = this.vehicles.delete(existing.id);
    if (deleted) {
      this.history.delete(existing.id);
      this.scheduleSave();
    }
    return deleted;
  }

  // --- TELEMETRY POSITION & HISTORY ---

  public updateTelemetryPosition(point: {
    vehicleId: string;
    latitude: number;
    longitude: number;
    speed?: number;
    heading?: number;
    timestamp?: number;
    status?: string;
    geofenceStatus?: string;
    currentGeofence?: string;
  }): Vehicle {
    let vehicle = this.getVehicleById(point.vehicleId);

    const now = point.timestamp || Date.now();
    const speed = point.speed !== undefined ? Math.round(point.speed * 10) / 10 : (vehicle?.speed || 0);
    const heading = point.heading !== undefined ? point.heading : (vehicle?.heading || 0);

    const vehicleStatus: 'active' | 'idle' | 'offline' =
      point.status === 'offline' ? 'offline' : (speed > 1 ? 'active' : 'idle');

    const geofenceStatus: 'inside' | 'breached' | 'clear' | 'none' =
      (point.geofenceStatus as any) || vehicle?.geofenceStatus || 'inside';

    if (!vehicle) {
      vehicle = {
        id: point.vehicleId,
        name: `Fleet Unit #${point.vehicleId.replace(/[^0-9]/g, '') || point.vehicleId}`,
        status: vehicleStatus,
        speed,
        heading,
        latitude: point.latitude,
        longitude: point.longitude,
        lastUpdated: now,
        geofenceStatus,
        currentGeofence: point.currentGeofence || 'Metro Distribution Hub A',
        model: 'Commercial Freight Unit',
        fuelLevel: 80,
        odometer: 15000,
      };
      this.vehicles.set(vehicle.id, vehicle);
    } else {
      vehicle = {
        ...vehicle,
        latitude: point.latitude,
        longitude: point.longitude,
        speed,
        heading,
        status: vehicleStatus,
        lastUpdated: now,
        geofenceStatus,
        currentGeofence: point.currentGeofence !== undefined ? point.currentGeofence : vehicle.currentGeofence,
      };
      this.vehicles.set(vehicle.id, vehicle);
    }

    this.addBreadcrumb(vehicle.id, {
      timestamp: now,
      time: new Date(now).toLocaleTimeString(),
      speed,
      latitude: point.latitude,
      longitude: point.longitude,
      heading,
      geofenceStatus,
    });

    this.scheduleSave();
    return vehicle;
  }

  public addBreadcrumb(vehicleId: string, point: TelemetryBreadcrumb): void {
    const list = this.history.get(vehicleId) || [];
    list.unshift(point);
    if (list.length > 50) list.pop(); // Retain latest 50 trail points
    this.history.set(vehicleId, list);
  }

  public getBreadcrumbs(vehicleId: string): TelemetryBreadcrumb[] {
    const existing = this.getVehicleById(vehicleId);
    const trail = this.history.get(vehicleId) || (existing ? this.history.get(existing.id) : null);
    if (trail && trail.length > 0) return trail;

    // If no breadcrumbs yet, generate an initial realistic 5-point trail
    if (existing) {
      const synthTrail: TelemetryBreadcrumb[] = [];
      const now = Date.now();
      for (let i = 0; i < 5; i++) {
        synthTrail.push({
          timestamp: now - i * 60000,
          time: `${i === 0 ? 'Just now' : `${i * 2} mins ago`}`,
          speed: Math.max(0, existing.speed - i * 3),
          latitude: Number((existing.latitude - i * 0.003).toFixed(6)),
          longitude: Number((existing.longitude - i * 0.002).toFixed(6)),
          heading: existing.heading,
          geofenceStatus: existing.geofenceStatus,
        });
      }
      this.history.set(existing.id, synthTrail);
      return synthTrail;
    }

    return [];
  }

  // --- GEOFENCE REPOSITORY ---

  public getGeofences(): GeofenceZone[] {
    return Array.from(this.geofences.values());
  }

  public getGeofenceById(id: string): GeofenceZone | null {
    return this.geofences.get(id) || null;
  }

  public createGeofence(zone: GeofenceZone): GeofenceZone {
    this.geofences.set(zone.id, zone);
    this.scheduleSave();
    return zone;
  }

  public updateGeofence(id: string, updates: Partial<GeofenceZone>): GeofenceZone | null {
    const existing = this.geofences.get(id);
    if (!existing) return null;

    const updated: GeofenceZone = {
      ...existing,
      ...updates,
      id: existing.id,
    };
    this.geofences.set(id, updated);
    this.scheduleSave();
    return updated;
  }

  public deleteGeofence(id: string): boolean {
    const deleted = this.geofences.delete(id);
    if (deleted) this.scheduleSave();
    return deleted;
  }

  // --- ALERTS REPOSITORY ---

  public getAlerts(params: { severity?: string; acknowledged?: boolean; limit?: number } = {}): GeofenceAlert[] {
    let result = [...this.alerts];

    if (params.severity && params.severity !== 'all') {
      result = result.filter((a) => a.severity === params.severity);
    }

    if (params.acknowledged !== undefined) {
      result = result.filter((a) => a.acknowledged === params.acknowledged);
    }

    const limit = params.limit || 100;
    return result.slice(0, limit);
  }

  public createAlert(alertData: Omit<GeofenceAlert, 'id'>): GeofenceAlert {
    const alert: GeofenceAlert = {
      ...alertData,
      id: `alt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
    this.alerts.unshift(alert);
    if (this.alerts.length > 200) this.alerts.pop(); // Keep max 200
    this.scheduleSave();
    return alert;
  }

  public acknowledgeAlert(id: string): GeofenceAlert | null {
    const alert = this.alerts.find((a) => a.id === id);
    if (!alert) return null;
    alert.acknowledged = true;
    this.scheduleSave();
    return alert;
  }

  public clearAllAlerts(): void {
    this.alerts = [];
    this.scheduleSave();
  }

  // --- USERS REPOSITORY ---

  public getUserById(id: string): UserRecord | null {
    return this.users.get(id) || null;
  }

  public getUserByEmail(email: string): UserRecord | null {
    const target = email.toLowerCase().trim();
    for (const user of this.users.values()) {
      if (user.email.toLowerCase() === target) return user;
    }
    return null;
  }

  public createUser(user: UserRecord): UserRecord {
    this.users.set(user.id, user);
    this.scheduleSave();
    return user;
  }

  // --- STATS & ANALYTICS ---

  public getFleetStats(eventsPerSecond = 0): FleetStats {
    const all = Array.from(this.vehicles.values());
    let active = 0;
    let idle = 0;
    let offline = 0;
    let speedSum = 0;
    let latestTime = 0;

    for (const v of all) {
      if (v.status === 'active') active++;
      else if (v.status === 'idle') idle++;
      else if (v.status === 'offline') offline++;

      speedSum += v.speed;
      if (v.lastUpdated > latestTime) latestTime = v.lastUpdated;
    }

    const total = all.length;
    const averageSpeed = total > 0 ? Math.round(speedSum / total) : 0;
    const activeAlerts = this.alerts.filter((a) => !a.acknowledged).length;

    return {
      totalVehicles: total,
      activeVehicles: active,
      idleVehicles: idle,
      offlineVehicles: offline,
      activeAlerts,
      eventsPerSecond: eventsPerSecond > 0 ? eventsPerSecond : (active > 0 ? 1250 : 0),
      averageSpeed,
      connectionStatus: 'connected',
      lastIngestionTime: latestTime || Date.now(),
    };
  }

  public getDashboardAnalytics(): DashboardAnalytics {
    const all = Array.from(this.vehicles.values());
    let active = 0;
    let idle = 0;
    let offline = 0;

    const speedBins = {
      '0-20': 0,
      '21-40': 0,
      '41-60': 0,
      '61-80': 0,
      '81-100': 0,
      '100+': 0,
    };

    for (const v of all) {
      if (v.status === 'active') active++;
      else if (v.status === 'idle') idle++;
      else if (v.status === 'offline') offline++;

      const s = v.speed;
      if (s <= 20) speedBins['0-20'] += 1;
      else if (s <= 40) speedBins['21-40'] += 1;
      else if (s <= 60) speedBins['41-60'] += 1;
      else if (s <= 80) speedBins['61-80'] += 1;
      else if (s <= 100) speedBins['81-100'] += 1;
      else speedBins['100+'] += 1;
    }

    const statusDistribution = [
      { name: 'Active In-Transit', value: active, color: '#0066FF' },
      { name: 'Idle / Staged', value: idle, color: '#F59E0B' },
      { name: 'Offline / Maintenance', value: offline, color: '#64748B' },
    ];

    const speedDistribution = Object.entries(speedBins).map(([range, count]) => ({
      range: `${range} km/h`,
      count,
    }));

    // Alert severity breakdown
    let critical = 0;
    let warning = 0;
    let info = 0;
    for (const a of this.alerts) {
      if (a.severity === 'critical') critical++;
      else if (a.severity === 'warning') warning++;
      else info++;
    }

    const alertBreakdown = [
      { severity: 'critical' as const, count: critical, color: '#EF4444' },
      { severity: 'warning' as const, count: warning, color: '#F59E0B' },
      { severity: 'info' as const, count: info, color: '#0066FF' },
    ];

    // Activity trends for past 8 hours
    const activityTrends = [];
    const nowHour = new Date().getHours();
    for (let i = 7; i >= 0; i--) {
      const h = (nowHour - i + 24) % 24;
      const hourStr = `${h.toString().padStart(2, '0')}:00`;
      activityTrends.push({
        time: hourStr,
        active: Math.max(10, active - Math.floor(Math.sin(i) * 12)),
        idle: Math.max(5, idle + Math.floor(Math.cos(i) * 6)),
        offline: Math.max(2, offline + (i % 3)),
      });
    }

    // Historical throughput
    const throughputHistory = [];
    for (let i = 5; i >= 0; i--) {
      throughputHistory.push({
        time: `${i * 10}s ago`,
        events: 1800 + Math.floor(Math.sin(i) * 400),
        bytesKb: 58 + Math.floor(Math.cos(i) * 12),
      });
    }

    return {
      statusDistribution,
      activityTrends,
      throughputHistory,
      speedDistribution,
      alertBreakdown,
    };
  }
}

export const db = new Database();
