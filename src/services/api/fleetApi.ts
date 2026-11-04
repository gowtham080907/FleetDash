import {
  Vehicle,
  FleetStats,
  DashboardAnalytics,
  VehicleFilterParams,
  PaginatedVehicles,
} from '@/types/vehicle';
import { GeofenceZone, GeofenceAlert } from '@/types/geofence';
import {
  MOCK_VEHICLES,
  getMockFleetStats,
  MOCK_DASHBOARD_ANALYTICS,
} from './mockData';

export interface TelemetryHistoryResponse {
  vehicleId: string;
  breadcrumbs: Array<{
    timestamp: number;
    time: string;
    speed: number;
    latitude: number;
    longitude: number;
    heading: number;
    geofenceStatus?: string;
  }>;
}

export interface BackendHealthResponse {
  status: string;
  service: string;
  uptime: number;
  timestamp: string;
  worker: {
    ready: boolean;
    poolSize: number;
    activeWorkers: number;
  };
}

class FleetApiService {
  private apiBase: string;

  constructor() {
    this.apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
  }

  public get isDemoMode(): boolean {
    const override = localStorage.getItem('fleetdash_mode_override');
    if (override !== null) {
      return override === 'demo';
    }
    return import.meta.env.VITE_DEMO_MODE !== 'false';
  }

  public setDemoMode(demo: boolean): void {
    localStorage.setItem('fleetdash_mode_override', demo ? 'demo' : 'live');
  }

  private getAuthHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (typeof window !== 'undefined') {
      const token = sessionStorage.getItem('fleetdash_jwt_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
    return headers;
  }

  /**
   * Health check
   */
  async checkBackendHealth(): Promise<BackendHealthResponse | null> {
    try {
      const res = await fetch(`${this.apiBase}/health`, { signal: AbortSignal.timeout(3000) });
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  }

  /**
   * Fetches overall fleet statistics (KPI card data).
   */
  async getFleetStats(): Promise<FleetStats> {
    if (this.isDemoMode) {
      await new Promise((r) => setTimeout(r, 100));
      return getMockFleetStats();
    }

    try {
      const res = await fetch(`${this.apiBase}/fleet/stats`, {
        headers: this.getAuthHeaders(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      return await res.json();
    } catch (err) {
      console.warn('[FleetApi] Live fleet stats request failed, falling back to simulated metrics:', err);
      return getMockFleetStats();
    }
  }

  /**
   * Fetches dashboard analytical time-series and distributions for Recharts.
   */
  async getDashboardAnalytics(): Promise<DashboardAnalytics> {
    if (this.isDemoMode) {
      await new Promise((r) => setTimeout(r, 100));
      return MOCK_DASHBOARD_ANALYTICS;
    }

    try {
      const res = await fetch(`${this.apiBase}/telemetry/stats`, {
        headers: this.getAuthHeaders(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      return await res.json();
    } catch (err) {
      console.warn('[FleetApi] Live analytics request failed, falling back to demo data:', err);
      return MOCK_DASHBOARD_ANALYTICS;
    }
  }

  private getMockVehiclesPaginated(params: VehicleFilterParams = {}): PaginatedVehicles {
    let result = [...MOCK_VEHICLES];

    if (params.search) {
      const query = params.search.toLowerCase().trim();
      result = result.filter(
        (v) =>
          v.id.toLowerCase().includes(query) ||
          v.name.toLowerCase().includes(query) ||
          (v.driverName && v.driverName.toLowerCase().includes(query)) ||
          (v.currentGeofence && v.currentGeofence.toLowerCase().includes(query))
      );
    }

    if (params.status && params.status !== 'all') {
      result = result.filter((v) => v.status === params.status);
    }

    if (params.geofenceStatus && params.geofenceStatus !== 'all') {
      result = result.filter((v) => v.geofenceStatus === params.geofenceStatus);
    }

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

    const page = params.page || 1;
    const pageSize = params.pageSize || 10;
    const total = result.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const startIndex = (page - 1) * pageSize;
    const items = result.slice(startIndex, startIndex + pageSize);

    return { items, total, page, pageSize, totalPages };
  }

  /**
   * Fetches a paginated, filtered, and sorted list of vehicles.
   */
  async getVehicles(params: VehicleFilterParams = {}): Promise<PaginatedVehicles> {
    if (this.isDemoMode) {
      await new Promise((r) => setTimeout(r, 100));
      return this.getMockVehiclesPaginated(params);
    }

    try {
      const query = new URLSearchParams();
      if (params.search) query.set('search', params.search);
      if (params.status && params.status !== 'all') query.set('status', params.status);
      if (params.geofenceStatus && params.geofenceStatus !== 'all') query.set('geofenceStatus', params.geofenceStatus);
      if (params.sortBy) query.set('sortBy', params.sortBy);
      if (params.sortOrder) query.set('sortOrder', params.sortOrder);
      if (params.page) query.set('page', params.page.toString());
      if (params.pageSize) query.set('pageSize', params.pageSize.toString());

      const res = await fetch(`${this.apiBase}/vehicles?${query.toString()}`, {
        headers: this.getAuthHeaders(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      return await res.json();
    } catch (err) {
      console.warn('[FleetApi] Live vehicle fetch failed, falling back to mock dataset:', err);
      return this.getMockVehiclesPaginated(params);
    }
  }

  /**
   * Fetches a single vehicle by its unique ID.
   */
  async getVehicleById(id: string): Promise<Vehicle | null> {
    if (this.isDemoMode) {
      await new Promise((r) => setTimeout(r, 80));
      const vehicle = MOCK_VEHICLES.find((v) => v.id.toLowerCase() === id.toLowerCase());
      return vehicle || null;
    }

    try {
      const res = await fetch(`${this.apiBase}/vehicles/${id}`, {
        headers: this.getAuthHeaders(),
      });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      return await res.json();
    } catch (err) {
      console.warn(`[FleetApi] Live fetch for vehicle ${id} failed:`, err);
      const vehicle = MOCK_VEHICLES.find((v) => v.id.toLowerCase() === id.toLowerCase());
      return vehicle || null;
    }
  }

  /**
   * Fetches historical telemetry breadcrumb trail for a vehicle.
   */
  async getVehicleHistory(id: string): Promise<TelemetryHistoryResponse | null> {
    try {
      const res = await fetch(`${this.apiBase}/vehicles/${id}/history`, {
        headers: this.getAuthHeaders(),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  /**
   * Creates a new vehicle in the registry.
   */
  async createVehicle(data: Partial<Vehicle>): Promise<Vehicle> {
    const res = await fetch(`${this.apiBase}/vehicles`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `Failed to create vehicle: ${res.statusText}`);
    }
    return res.json();
  }

  /**
   * Updates an existing vehicle.
   */
  async updateVehicle(id: string, updates: Partial<Vehicle>): Promise<Vehicle> {
    const res = await fetch(`${this.apiBase}/vehicles/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `Failed to update vehicle: ${res.statusText}`);
    }
    return res.json();
  }

  /**
   * Deletes a vehicle from the fleet registry.
   */
  async deleteVehicle(id: string): Promise<boolean> {
    const res = await fetch(`${this.apiBase}/vehicles/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    if (!res.ok) {
      throw new Error(`Failed to delete vehicle: ${res.statusText}`);
    }
    return true;
  }

  /**
   * Fetches all registered geofences.
   */
  async getGeofences(): Promise<GeofenceZone[]> {
    try {
      const res = await fetch(`${this.apiBase}/geofences`, {
        headers: this.getAuthHeaders(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch {
      return [];
    }
  }

  /**
   * Creates a new geofence zone.
   */
  async createGeofence(data: Partial<GeofenceZone>): Promise<GeofenceZone> {
    const res = await fetch(`${this.apiBase}/geofences`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `Failed to create geofence: ${res.statusText}`);
    }
    return res.json();
  }

  /**
   * Updates an existing geofence.
   */
  async updateGeofence(id: string, updates: Partial<GeofenceZone>): Promise<GeofenceZone> {
    const res = await fetch(`${this.apiBase}/geofences/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      throw new Error(`Failed to update geofence: ${res.statusText}`);
    }
    return res.json();
  }

  /**
   * Deletes a geofence.
   */
  async deleteGeofence(id: string): Promise<boolean> {
    const res = await fetch(`${this.apiBase}/geofences/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    if (!res.ok) throw new Error(`Failed to delete geofence: ${res.statusText}`);
    return true;
  }

  /**
   * Fetches alerts from the backend.
   */
  async getAlerts(params: { severity?: string; acknowledged?: boolean; limit?: number } = {}): Promise<GeofenceAlert[]> {
    try {
      const query = new URLSearchParams();
      if (params.severity && params.severity !== 'all') query.set('severity', params.severity);
      if (params.acknowledged !== undefined) query.set('acknowledged', String(params.acknowledged));
      if (params.limit) query.set('limit', String(params.limit));

      const res = await fetch(`${this.apiBase}/alerts?${query.toString()}`, {
        headers: this.getAuthHeaders(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch {
      return [];
    }
  }

  /**
   * Acknowledges an alert.
   */
  async acknowledgeAlert(id: string): Promise<GeofenceAlert | null> {
    try {
      const res = await fetch(`${this.apiBase}/alerts/${id}/ack`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  /**
   * Clears all alerts from feed.
   */
  async clearAllAlerts(): Promise<boolean> {
    try {
      const res = await fetch(`${this.apiBase}/alerts`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Pipeline telemetry rates & stats.
   */
  async getPipelineStats(): Promise<any> {
    try {
      const res = await fetch(`${this.apiBase}/telemetry/pipeline-stats`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }
}

export const fleetApi = new FleetApiService();
