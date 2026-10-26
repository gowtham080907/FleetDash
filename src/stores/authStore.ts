import { create } from 'zustand';
import { AuthState, User } from '@/types/auth';

const DEMO_USER: User = {
  id: 'usr-demo-01',
  name: 'Sarah Jenkins',
  email: 's.jenkins@fleetdash.io',
  role: 'fleet_manager',
  department: 'Real-Time Dispatch Operations',
};

const getStoredSession = (): { user: User | null; isAuthenticated: boolean } => {
  if (typeof window === 'undefined') return { user: null, isAuthenticated: false };
  try {
    const raw = sessionStorage.getItem('fleetdash_auth_session');
    if (raw) {
      const parsed = JSON.parse(raw);
      return { user: parsed.user, isAuthenticated: true };
    }
  } catch {
    // Ignore parse errors
  }
  return { user: null, isAuthenticated: false };
};

const initialSession = getStoredSession();

export const useAuthStore = create<AuthState>((set) => ({
  user: initialSession.user,
  isAuthenticated: initialSession.isAuthenticated,
  isLoading: false,
  isDemoMode: import.meta.env.VITE_DEMO_MODE !== 'false',
  error: null,

  login: async (email: string, password?: string, isDemo = false): Promise<boolean> => {
    set({ isLoading: true, error: null });

    try {
      // Simulate network latency for authentic feel
      await new Promise((res) => setTimeout(res, 600));

      if (isDemo || email.toLowerCase().includes('demo')) {
        const user: User = DEMO_USER;
        sessionStorage.setItem('fleetdash_auth_session', JSON.stringify({ user }));
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
        return true;
      }

      // Production / standard validation:
      if (!email || !password) {
        set({ isLoading: false, error: 'Email and password are required' });
        return false;
      }

      if (password.length < 6) {
        set({ isLoading: false, error: 'Password must be at least 6 characters' });
        return false;
      }

      // For standard logins before backend integration:
      const user: User = {
        id: 'usr-standard-01',
        name: email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        email,
        role: 'fleet_manager',
        department: 'Operations',
      };

      sessionStorage.setItem('fleetdash_auth_session', JSON.stringify({ user }));
      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
      return true;
    } catch {
      set({
        isLoading: false,
        error: 'Authentication failed. Please verify credentials.',
      });
      return false;
    }
  },

  logout: () => {
    sessionStorage.removeItem('fleetdash_auth_session');
    set({
      user: null,
      isAuthenticated: false,
      error: null,
    });
  },

  clearError: () => set({ error: null }),
}));
