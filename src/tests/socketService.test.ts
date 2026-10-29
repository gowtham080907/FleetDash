import { describe, it, expect } from 'vitest';
import { socketService } from '../services/socket/socketService';

describe('Socket Service Lifecycle', () => {
  it('manages connection status and transitions', () => {
    socketService.disconnect();
    expect(socketService.getStatus()).toBe('disconnected');

    socketService.connect();
    // In demo mode or initialization, it enters connecting or connected
    expect(['connecting', 'connected']).toContain(socketService.getStatus());
  });

  it('allows safe event subscriptions and clean disposal', () => {
    let receivedPayload: unknown = null;

    const unsubscribe = socketService.on('vehicle:status', (payload) => {
      receivedPayload = payload;
    });

    socketService.dispatch('vehicle:status', { vehicleId: 'VH-1001', status: 'idle' });
    expect(receivedPayload).toEqual({ vehicleId: 'VH-1001', status: 'idle' });

    // Test unsubscribe disposal
    unsubscribe();
    receivedPayload = null;
    socketService.dispatch('vehicle:status', { vehicleId: 'VH-1002', status: 'active' });
    expect(receivedPayload).toBeNull();
  });
});
