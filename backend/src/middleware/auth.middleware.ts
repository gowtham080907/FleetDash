import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { AppError } from '../utils/AppError';
import { User } from '../types/auth';

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return next(new AppError('Authorization header required', 401, 'UNAUTHORIZED'));
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1]) {
    return next(new AppError('Invalid authorization format. Bearer <token> required', 401, 'INVALID_TOKEN'));
  }

  const token = parts[1];
  const payload = authService.verifyToken(token);
  if (!payload) {
    return next(new AppError('Token invalid or expired', 401, 'TOKEN_EXPIRED'));
  }

  req.user = payload;
  next();
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader) return next();

  const parts = authHeader.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer' && parts[1]) {
    const payload = authService.verifyToken(parts[1]);
    if (payload) {
      req.user = payload;
    }
  }
  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401, 'UNAUTHORIZED'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError('Forbidden: Insufficient privileges', 403, 'FORBIDDEN'));
    }

    next();
  };
}
