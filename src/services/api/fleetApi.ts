import {
  Vehicle,
  FleetStats,
  DashboardAnalytics,
  VehicleFilterParams,
  PaginatedVehicles,
} from '@/types/vehicle';
import {
  MOCK_VEHICLES,
  getMockFleetStats,
  MOCK_DASHBOARD_ANALYTICS,
} from './mockData';

const isDemo = import.meta.env.VITE_DEMO_MODE !== 'false';
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

class FleetApiService {
  /**
   * Fetches overall fleet statistics (KPI card data).
   */
  async getFleetStats(): Promise<FleetStats> {
    if (isDemo) {
      await new Promise((r) => setTimeout(r, 150));
      return getMockFleetStats();
    }

    const res = await fetch(`${API_BASE}/fleet/stats`);
    if (!res.ok) throw new Error(`Failed to fetch fleet stats: ${res.statusText}`);
    return res.json();
  }

  /**
   * Fetches dashboard analytical time-series and distributions for Recharts.
   */
  async getDashboardAnalytics(): Promise<DashboardAnalytics> {
    if (isDemo) {
      await new Promise((r) => setTimeout(r, 150));
      return MOCK_DASHBOARD_ANALYTICS;
    }

    const res = await fetch(`${API_BASE}/telemetry/stats`);
    if (!res.ok) throw new Error(`Failed to fetch analytics: ${res.statusText}`);
    return res.json();
  }

  /**
   * Fetches a paginated, filtered, and sorted list of vehicles.
   */
  async getVehicles(params: VehicleFilterParams = {}): Promise<PaginatedVehicles> {
    if (isDemo) {
      await new Promise((r) => setTimeout(r, 200));

      let result = [...MOCK_VEHICLES];

      // Search filter
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

      const page = params.page || 1;
      const pageSize = params.pageSize || 10;
      const total = result.length;
      const totalPages = Math.ceil(total / pageSize);
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

    // Production API query string construction:
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.status && params.status !== 'all') query.set('status', params.status);
    if (params.geofenceStatus && params.geofenceStatus !== 'all') query.set('geofenceStatus', params.geofenceStatus);
    if (params.sortBy) query.set('sortBy', params.sortBy);
    if (params.sortOrder) query.set('sortOrder', params.sortOrder);
    if (params.page) query.set('page', params.page.toString());
    if (params.pageSize) query.set('pageSize', params.pageSize.toString());

    const res = await fetch(`${API_BASE}/vehicles?${query.toString()}`);
    if (!res.ok) throw new Error(`Failed to fetch vehicles: ${res.statusText}`);
    return res.json();
  }

  /**
   * Fetches a single vehicle by its unique ID.
   */
  async getVehicleById(id: string): Promise<Vehicle | null> {
    if (isDemo) {
      await new Promise((r) => setTimeout(r, 100));
      const vehicle = MOCK_VEHICLES.find((v) => v.id.toLowerCase() === id.toLowerCase());
      return vehicle || null;
    }

    const res = await fetch(`${API_BASE}/vehicles/${id}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Failed to fetch vehicle ${id}: ${res.statusText}`);
    return res.json();
  }
}

export const fleetApi = new FleetApiService();
