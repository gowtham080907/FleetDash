import { describe, it, expect } from 'vitest';
import { fleetApi } from '../services/api/fleetApi';

describe('Fleet API Service', () => {
  it('returns valid fleet overview statistics', async () => {
    const stats = await fleetApi.getFleetStats();
    expect(stats.totalVehicles).toBeGreaterThan(0);
    expect(stats.activeVehicles + stats.idleVehicles + stats.offlineVehicles).toBe(stats.totalVehicles);
    expect(stats.connectionStatus).toBe('connected');
    expect(stats.eventsPerSecond).toBeGreaterThan(0);
  });

  it('paginates vehicle list correctly', async () => {
    const page1 = await fleetApi.getVehicles({ page: 1, pageSize: 5 });
    expect(page1.items.length).toBe(5);
    expect(page1.page).toBe(1);
    expect(page1.pageSize).toBe(5);
    expect(page1.totalPages).toBeGreaterThan(1);
  });

  it('filters vehicles by status', async () => {
    const activeOnly = await fleetApi.getVehicles({ status: 'active', pageSize: 50 });
    expect(activeOnly.items.length).toBeGreaterThan(0);
    for (const v of activeOnly.items) {
      expect(v.status).toBe('active');
    }

    const idleOnly = await fleetApi.getVehicles({ status: 'idle', pageSize: 50 });
    for (const v of idleOnly.items) {
      expect(v.status).toBe('idle');
    }
  });

  it('filters vehicles by search query', async () => {
    const searchResult = await fleetApi.getVehicles({ search: 'VH-1001' });
    expect(searchResult.items.length).toBe(1);
    expect(searchResult.items[0].id).toBe('VH-1001');
  });

  it('sorts vehicles by speed in descending order', async () => {
    const sorted = await fleetApi.getVehicles({ sortBy: 'speed', sortOrder: 'desc', pageSize: 10 });
    for (let i = 0; i < sorted.items.length - 1; i++) {
      expect(sorted.items[i].speed).toBeGreaterThanOrEqual(sorted.items[i + 1].speed);
    }
  });

  it('retrieves single vehicle by ID', async () => {
    const vehicle = await fleetApi.getVehicleById('VH-1005');
    expect(vehicle).not.toBeNull();
    expect(vehicle?.id).toBe('VH-1005');
    expect(vehicle?.latitude).toBeDefined();
    expect(vehicle?.longitude).toBeDefined();
  });
});
