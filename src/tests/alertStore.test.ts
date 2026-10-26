import { describe, it, expect, beforeEach } from 'vitest';
import { useAlertStore } from '../stores/alertStore';

describe('Alert Store & Geofences', () => {
  beforeEach(() => {
    useAlertStore.getState().clearAllAlerts();
  });

  it('initializes with zero unacknowledged alerts after clear', () => {
    expect(useAlertStore.getState().alerts.length).toBe(0);
    expect(useAlertStore.getState().unreadAlertsCount).toBe(0);
  });

  it('adds new breach alerts and increments unread count', () => {
    useAlertStore.getState().addAlert({
      vehicleId: 'VH-1099',
      geofenceId: 'geo-ohare-hub',
      geofenceName: 'O\'Hare Logistics Air Hub',
      type: 'breach',
      severity: 'critical',
      timestamp: Date.now(),
      latitude: 41.9800,
      longitude: -87.9100,
      speed: 82.5,
    });

    const state = useAlertStore.getState();
    expect(state.alerts.length).toBe(1);
    expect(state.unreadAlertsCount).toBe(1);
    expect(state.alerts[0].vehicleId).toBe('VH-1099');
    expect(state.alerts[0].acknowledged).toBe(false);
  });

  it('acknowledges an alert and decrements unread counter', () => {
    useAlertStore.getState().addAlert({
      vehicleId: 'VH-1050',
      geofenceId: 'geo-south-marine',
      geofenceName: 'South Shore Marine Port Gate',
      type: 'breach',
      severity: 'critical',
      timestamp: Date.now(),
      latitude: 41.7600,
      longitude: -87.5600,
      speed: 70.0,
    });

    const alertId = useAlertStore.getState().alerts[0].id;
    useAlertStore.getState().acknowledgeAlert(alertId);

    const state = useAlertStore.getState();
    expect(state.alerts[0].acknowledged).toBe(true);
    expect(state.unreadAlertsCount).toBe(0);
  });

  it('toggles geofence perimeter visibility', () => {
    const geofence = useAlertStore.getState().geofences[0];
    const initialVisibility = geofence.visible;

    useAlertStore.getState().toggleGeofenceVisibility(geofence.id);
    const updated = useAlertStore.getState().geofences.find((g) => g.id === geofence.id);

    expect(updated?.visible).toBe(!initialVisibility);
  });
});
