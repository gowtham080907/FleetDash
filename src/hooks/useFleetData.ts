import { useQuery } from '@tanstack/react-query';
import { fleetApi } from '@/services/api/fleetApi';
import { VehicleFilterParams } from '@/types/vehicle';

export const FLEET_QUERY_KEYS = {
  stats: ['fleet', 'stats'] as const,
  analytics: ['fleet', 'analytics'] as const,
  vehicles: (params: VehicleFilterParams) => ['fleet', 'vehicles', params] as const,
  vehicle: (id: string) => ['fleet', 'vehicle', id] as const,
};

export function useFleetStats() {
  return useQuery({
    queryKey: FLEET_QUERY_KEYS.stats,
    queryFn: () => fleetApi.getFleetStats(),
    refetchInterval: 10_000, // Poll low-frequency overview stats every 10s
  });
}

export function useDashboardAnalytics() {
  return useQuery({
    queryKey: FLEET_QUERY_KEYS.analytics,
    queryFn: () => fleetApi.getDashboardAnalytics(),
    staleTime: 30_000,
  });
}

export function useVehicles(params: VehicleFilterParams = {}) {
  return useQuery({
    queryKey: FLEET_QUERY_KEYS.vehicles(params),
    queryFn: () => fleetApi.getVehicles(params),
    placeholderData: (previousData) => previousData,
  });
}

export function useVehicle(id: string | undefined) {
  return useQuery({
    queryKey: FLEET_QUERY_KEYS.vehicle(id || ''),
    queryFn: () => (id ? fleetApi.getVehicleById(id) : Promise.resolve(null)),
    enabled: Boolean(id),
  });
}
