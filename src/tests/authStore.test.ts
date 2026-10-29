import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../stores/authStore';

describe('AuthStore', () => {
  beforeEach(() => {
    useAuthStore.getState().logout();
  });

  it('starts unauthenticated', () => {
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
  });

  it('authenticates demo user successfully', async () => {
    const success = await useAuthStore.getState().login('demo@fleetdash.io', 'anyPassword', true);
    expect(success).toBe(true);

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user?.name).toBe('Sarah Jenkins');
    expect(state.user?.role).toBe('fleet_manager');
  });

  it('rejects short passwords in standard login', async () => {
    const success = await useAuthStore.getState().login('dispatcher@fleetdash.io', '123', false);
    expect(success).toBe(false);

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.error).toContain('at least 6 characters');
  });

  it('logs out and clears session', async () => {
    await useAuthStore.getState().login('demo@fleetdash.io', 'any', true);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    useAuthStore.getState().logout();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
  });
});
