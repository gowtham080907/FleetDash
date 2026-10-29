import { create } from 'zustand';
import { GeofenceZone, GeofenceAlert } from '@/types/geofence';
import { socketService } from '@/services/socket/socketService';

export const INITIAL_GEOFENCES: GeofenceZone[] = [
  {
    id: 'geo-ohare-hub',
    name: 'O\'Hare Logistics Air Hub',
    type: 'circle',
    center: [41.9742, -87.9073],
    radiusMeters: 6500,
    color: '#0066FF',
    fillOpacity: 0.15,
    speedLimitKmH: 45,
    description: 'High-security priority air freight handling corridor',
    visible: true,
    activeVehiclesCount: 18,
    breachCount: 1,
  },
  {
    id: 'geo-central-freight',
    name: 'Midwest Central Freight Depot',
    type: 'polygon',
    coordinates: [
      [41.9100, -87.7200],
      [41.9100, -87.6100],
      [41.8300, -87.6100],
      [41.8300, -87.7200],
    ],
    color: '#10B981',
    fillOpacity: 0.12,
    speedLimitKmH: 60,
    description: 'Central distribution hub and inland intermodal yard',
    visible: true,
    activeVehiclesCount: 26,
    breachCount: 2,
  },
  {
    id: 'geo-south-marine',
    name: 'South Shore Marine Port Gate',
    type: 'circle',
    center: [41.7580, -87.5540],
    radiusMeters: 5500,
    color: '#F59E0B',
    fillOpacity: 0.15,
    speedLimitKmH: 35,
    description: 'Port container terminal transfer and customs yard',
    visible: true,
    activeVehiclesCount: 12,
    breachCount: 1,
  },
  {
    id: 'geo-north-corridor',
    name: 'North Interstate Freight Belt',
    type: 'polygon',
    coordinates: [
      [42.0400, -87.8500],
      [42.0400, -87.7500],
      [41.9600, -87.7500],
      [41.9600, -87.8500],
    ],
    color: '#8B5CF6',
    fillOpacity: 0.12,
    speedLimitKmH: 80,
    description: 'Heavy industrial transit route and staging bays',
    visible: true,
    activeVehiclesCount: 14,
    breachCount: 0,
  },
];

const INITIAL_ALERTS: GeofenceAlert[] = [
  {
    id: 'alt-101',
    vehicleId: 'VH-1012',
    geofenceId: 'geo-ohare-hub',
    geofenceName: 'O\'Hare Logistics Air Hub',
    type: 'breach',
    severity: 'critical',
    timestamp: Date.now() - 4 * 60 * 1000,
    latitude: 41.9812,
    longitude: -87.9150,
    speed: 84.2,
    acknowledged: false,
  },
  {
    id: 'alt-102',
    vehicleId: 'VH-1027',
    geofenceId: 'geo-central-freight',
    geofenceName: 'Midwest Central Freight Depot',
    type: 'breach',
    severity: 'critical',
    timestamp: Date.now() - 11 * 60 * 1000,
    latitude: 41.8210,
    longitude: -87.6050,
    speed: 76.5,
    acknowledged: false,
  },
  {
    id: 'alt-103',
    vehicleId: 'VH-1044',
    geofenceId: 'geo-central-freight',
    geofenceName: 'Midwest Central Freight Depot',
    type: 'breach',
    severity: 'critical',
    timestamp: Date.now() - 22 * 60 * 1000,
    latitude: 41.9150,
    longitude: -87.6200,
    speed: 91.0,
    acknowledged: true,
  },
  {
    id: 'alt-104',
    vehicleId: 'VH-1058',
    geofenceId: 'geo-south-marine',
    geofenceName: 'South Shore Marine Port Gate',
    type: 'breach',
    severity: 'critical',
    timestamp: Date.now() - 35 * 60 * 1000,
    latitude: 41.7500,
    longitude: -87.5400,
    speed: 78.0,
    acknowledged: true,
  },
];

interface AlertStoreState {
  geofences: GeofenceZone[];
  alerts: GeofenceAlert[];
  unreadAlertsCount: number;
  addAlert: (alert: Omit<GeofenceAlert, 'id' | 'acknowledged'>) => void;
  acknowledgeAlert: (id: string) => void;
  clearAllAlerts: () => void;
  toggleGeofenceVisibility: (id: string) => void;
}

export const useAlertStore = create<AlertStoreState>((set) => ({
  geofences: INITIAL_GEOFENCES,
  alerts: INITIAL_ALERTS,
  unreadAlertsCount: INITIAL_ALERTS.filter((a) => !a.acknowledged).length,

  addAlert: (alertData) => {
    const newAlert: GeofenceAlert = {
      ...alertData,
      id: `alt-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      acknowledged: false,
    };

    set((state) => {
      const updated = [newAlert, ...state.alerts.slice(0, 99)]; // Keep max 100
      return {
        alerts: updated,
        unreadAlertsCount: state.unreadAlertsCount + 1,
      };
    });
  },

  acknowledgeAlert: (id: string) => {
    set((state) => {
      const updated = state.alerts.map((a) =>
        a.id === id ? { ...a, acknowledged: true } : a
      );
      return {
        alerts: updated,
        unreadAlertsCount: updated.filter((a) => !a.acknowledged).length,
      };
    });
  },

  clearAllAlerts: () => {
    set({ alerts: [], unreadAlertsCount: 0 });
  },

  toggleGeofenceVisibility: (id: string) => {
    set((state) => ({
      geofences: state.geofences.map((g) =>
        g.id === id ? { ...g, visible: !g.visible } : g
      ),
    }));
  },
}));

// Automatically wire socket geofence breaches to the alert store
socketService.on('geofence:breach', (payload) => {
  useAlertStore.getState().addAlert({
    vehicleId: payload.vehicleId,
    geofenceId: payload.geofenceId,
    geofenceName: payload.geofenceName,
    type: 'breach',
    severity: 'critical',
    timestamp: payload.timestamp,
    latitude: payload.latitude,
    longitude: payload.longitude,
    speed: payload.speed,
  });
});
