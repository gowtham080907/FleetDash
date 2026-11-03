import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fleetApi } from '@/services/api/fleetApi';
import { Vehicle, VehicleFilterParams } from '@/types/vehicle';

export const FLEET_QUERY_KEYS = {
  stats: ['fleet', 'stats'] as const,
  analytics: ['fleet', 'analytics'] as const,
  vehicles: (params: VehicleFilterParams) => ['fleet', 'vehicles', params] as const,
  vehicle: (id: string) => ['fleet', 'vehicle', id] as const,
  history: (id: string) => ['fleet', 'history', id] as const,
  health: ['backend', 'health'] as const,
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

export function useVehicleHistory(id: string | undefined) {
  return useQuery({
    queryKey: FLEET_QUERY_KEYS.history(id || ''),
    queryFn: () => (id ? fleetApi.getVehicleHistory(id) : Promise.resolve(null)),
    enabled: Boolean(id),
  });
}

export function useBackendHealth() {
  return useQuery({
    queryKey: FLEET_QUERY_KEYS.health,
    queryFn: () => fleetApi.checkBackendHealth(),
    refetchInterval: 15_000,
  });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (newVehicle: Partial<Vehicle>) => fleetApi.createVehicle(newVehicle),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fleet'] });
    },
  });
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Vehicle> }) =>
      fleetApi.updateVehicle(id, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['fleet'] });
      queryClient.invalidateQueries({ queryKey: FLEET_QUERY_KEYS.vehicle(variables.id) });
    },
  });
}

export function useDeleteVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fleetApi.deleteVehicle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fleet'] });
    },
  });
}
