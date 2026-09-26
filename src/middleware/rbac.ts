import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';
import { UserRole } from '../types';

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new ForbiddenError(
        `Access denied. Role '${req.user.role}' is not authorized for this operation`
      );
    }

    next();
  };
}

export function requireManager(req: Request, res: Response, next: NextFunction): void {
  return requireRole('inventory_manager')(req, res, next);
}

export function enforceWarehouseScope(docWarehouseId: string, req: Request): void {
  if (!req.user) {
    throw new UnauthorizedError();
  }
  // Inventory manager has global visibility
  if (req.user.role === 'inventory_manager') {
    return;
  }
  // Warehouse staff can only interact with their assigned warehouse
  if (req.user.role === 'warehouse_staff') {
    if (!req.user.warehouse_id || req.user.warehouse_id !== docWarehouseId) {
      throw new ForbiddenError('Warehouse staff can only access or validate documents in their assigned warehouse');
    }
  }
}
