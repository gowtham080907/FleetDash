export type UserRole = 'admin' | 'fleet_manager' | 'viewer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  department?: string;
}

export interface UserRecord extends User {
  passwordHash: string;
  createdAt: number;
  updatedAt: number;
}

export interface AuthResponse {
  user: User;
  token: string;
}

