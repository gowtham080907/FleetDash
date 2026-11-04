import { create } from 'zustand';
import { AuthState, User } from '@/types/auth';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

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
    const token = sessionStorage.getItem('fleetdash_jwt_token');
    if (raw && token) {
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
      const isDemoAttempt = isDemo || email.toLowerCase().includes('demo');

      if (!isDemoAttempt) {
        if (!email || !password) {
          set({ isLoading: false, error: 'Email and password are required' });
          return false;
        }

        if (password.length < 6) {
          set({ isLoading: false, error: 'Password must be at least 6 characters' });
          return false;
        }
      }

      // Attempt real backend authentication
      try {
        const response = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: password || (isDemoAttempt ? 'FleetDemo2026!' : '') }),
        });

        if (response.ok) {
          const data = await response.json();
          const { user, token } = data;
          sessionStorage.setItem('fleetdash_auth_session', JSON.stringify({ user }));
          if (token) {
            sessionStorage.setItem('fleetdash_jwt_token', token);
          }
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          return true;
        }

        // If backend returned explicit authentication error
        if (response.status === 401 || response.status === 400) {
          const errorData = await response.json().catch(() => ({}));
          const errMsg = errorData?.error?.message || 'Invalid email or password';
          set({ isLoading: false, error: errMsg });
          return false;
        }
      } catch (networkErr) {
        // If backend server is offline and user attempted demo login, allow local fallback
        if (isDemoAttempt) {
          const user: User = DEMO_USER;
          sessionStorage.setItem('fleetdash_auth_session', JSON.stringify({ user }));
          sessionStorage.setItem('fleetdash_jwt_token', 'mock_demo_jwt_token');
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          return true;
        }

        set({
          isLoading: false,
          error: 'Unable to connect to backend authentication server. Ensure backend is running.',
        });
        return false;
      }

      // Basic client-side validation fallback
      if (!email || !password) {
        set({ isLoading: false, error: 'Email and password are required' });
        return false;
      }

      if (password.length < 6) {
        set({ isLoading: false, error: 'Password must be at least 6 characters' });
        return false;
      }

      const user: User = {
        id: 'usr-standard-01',
        name: email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        email,
        role: 'fleet_manager',
        department: 'Operations',
      };

      sessionStorage.setItem('fleetdash_auth_session', JSON.stringify({ user }));
      sessionStorage.setItem('fleetdash_jwt_token', 'local_jwt_session_token');
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
    try {
      fetch(`${API_BASE}/auth/logout`, { method: 'POST' }).catch(() => {});
    } catch {}
    sessionStorage.removeItem('fleetdash_auth_session');
    sessionStorage.removeItem('fleetdash_jwt_token');
    set({
      user: null,
      isAuthenticated: false,
      error: null,
    });
  },

  clearError: () => set({ error: null }),
}));
