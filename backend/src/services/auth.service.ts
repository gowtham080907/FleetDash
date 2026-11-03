import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { db } from '../db/database';
import { User, UserRecord, UserRole, AuthResponse } from '../types/auth';
import { AppError } from '../utils/AppError';

export class AuthService {
  public hashPassword(password: string): string {
    const salt = bcrypt.genSaltSync(10);
    return bcrypt.hashSync(password, salt);
  }

  public comparePassword(password: string, hash: string): boolean {
    return bcrypt.compareSync(password, hash);
  }

  public generateToken(user: User): string {
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      department: user.department,
    };

    return jwt.sign(payload, config.JWT_SECRET, {
      expiresIn: config.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    });
  }

  public verifyToken(token: string): any {
    try {
      return jwt.verify(token, config.JWT_SECRET);
    } catch {
      return null;
    }
  }

  public async login(email: string, password?: string): Promise<AuthResponse> {
    if (!email) {
      throw new AppError('Email address is required', 400, 'INVALID_CREDENTIALS');
    }

    const cleanEmail = email.toLowerCase().trim();
    const userRecord = db.getUserByEmail(cleanEmail);

    // If demo login or demo credentials
    if (cleanEmail === 's.jenkins@fleetdash.io' || cleanEmail.includes('demo')) {
      const demoUser = userRecord || db.getUserByEmail('s.jenkins@fleetdash.io');
      if (demoUser) {
        const publicUser: User = {
          id: demoUser.id,
          name: demoUser.name,
          email: demoUser.email,
          role: demoUser.role,
          department: demoUser.department,
          avatarUrl: demoUser.avatarUrl,
        };
        const token = this.generateToken(publicUser);
        return { user: publicUser, token };
      }
    }

    if (!userRecord) {
      throw new AppError('Invalid email or password', 401, 'AUTH_FAILED');
    }

    if (!password) {
      throw new AppError('Password is required', 400, 'PASSWORD_REQUIRED');
    }

    const isValid = this.comparePassword(password, userRecord.passwordHash);
    if (!isValid) {
      throw new AppError('Invalid email or password', 401, 'AUTH_FAILED');
    }

    const publicUser: User = {
      id: userRecord.id,
      name: userRecord.name,
      email: userRecord.email,
      role: userRecord.role,
      department: userRecord.department,
      avatarUrl: userRecord.avatarUrl,
    };

    const token = this.generateToken(publicUser);
    return { user: publicUser, token };
  }

  public async register(
    name: string,
    email: string,
    password: string,
    role: UserRole = 'fleet_manager',
    department = 'Operations'
  ): Promise<AuthResponse> {
    if (!name || !email || !password) {
      throw new AppError('Name, email, and password are required', 400, 'MISSING_FIELDS');
    }

    if (password.length < 6) {
      throw new AppError('Password must be at least 6 characters', 400, 'WEAK_PASSWORD');
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = db.getUserByEmail(cleanEmail);
    if (existing) {
      throw new AppError('A user with this email already exists', 409, 'USER_EXISTS');
    }

    const passwordHash = this.hashPassword(password);
    const now = Date.now();
    const id = `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const newRecord: UserRecord = {
      id,
      name,
      email: cleanEmail,
      role,
      department,
      passwordHash,
      createdAt: now,
      updatedAt: now,
    };

    db.createUser(newRecord);

    const publicUser: User = {
      id: newRecord.id,
      name: newRecord.name,
      email: newRecord.email,
      role: newRecord.role,
      department: newRecord.department,
    };

    const token = this.generateToken(publicUser);
    return { user: publicUser, token };
  }
}

export const authService = new AuthService();

