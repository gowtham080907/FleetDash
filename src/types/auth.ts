export type UserRole = 'admin' | 'fleet_manager' | 'viewer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  department?: string;
  organization?: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
  organization?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isDemoMode: boolean;
  error: string | null;
  login: (email: string, password?: string, isDemo?: boolean) => Promise<boolean>;
  registerUser: (payload: RegisterPayload) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
}
