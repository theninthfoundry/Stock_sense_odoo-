import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { getDb } from '../db/database';
import { UnauthorizedError } from '../utils/errors';
import { User } from '../types';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'inventory_manager' | 'warehouse_staff';
  warehouse_id?: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      idempotencyKey?: string;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or malformed Authorization header');
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as { userId: string };
    const db = getDb();
    const user = db.prepare('SELECT id, name, email, role, warehouse_id FROM users WHERE id = ?').get(decoded.userId) as AuthUser | undefined;

    if (!user) {
      throw new UnauthorizedError('User account not found or has been removed');
    }

    req.user = user;
    next();
  } catch (err: any) {
    if (err instanceof UnauthorizedError) throw err;
    throw new UnauthorizedError('Invalid or expired authentication token');
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as { userId: string };
    const db = getDb();
    const user = db.prepare('SELECT id, name, email, role, warehouse_id FROM users WHERE id = ?').get(decoded.userId) as AuthUser | undefined;
    if (user) {
      req.user = user;
    }
  } catch {
    // Ignore invalid token in optional auth
  }
  next();
}
