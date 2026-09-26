import { Router, Request, Response, NextFunction } from 'express';
import { getDb } from '../db/database';
import { authenticate } from '../middleware/auth';
import { requireManager } from '../middleware/rbac';
import { StockService } from '../services/stockService';
import { ValidationError } from '../utils/errors';

export const adjustmentsRouter = Router();

// GET /adjustments
adjustmentsRouter.get('/', authenticate, (_req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const adjustments = db.prepare(`
      SELECT
        a.id, a.product_id, p.name as product_name, p.sku as product_sku, p.uom,
        a.location_id, l.name as location_name, l.code as location_code,
        w.name as warehouse_name,
        a.counted_qty, a.delta, a.reason,
        a.created_by, u.name as created_by_name,
        a.created_at
      FROM adjustments a
      JOIN products p ON a.product_id = p.id
      JOIN locations l ON a.location_id = l.id
      JOIN warehouses w ON l.warehouse_id = w.id
      JOIN users u ON a.created_by = u.id
      ORDER BY a.created_at DESC
    `).all();

    res.status(200).json({
      data: adjustments,
      next_cursor: null
    });
  } catch (err) {
    next(err);
  }
});

// POST /adjustments - Physical stock reconciliation (Manager only)
adjustmentsRouter.post('/', authenticate, requireManager, (req: Request, res: Response, next: NextFunction) => {
  try {
    const { product_id, location_id, counted_qty, reason } = req.body;

    if (!product_id) {
      throw new ValidationError('Product is required', 'product_id');
    }
    if (!location_id) {
      throw new ValidationError('Location is required', 'location_id');
    }
    if (counted_qty === undefined || counted_qty === null || Number(counted_qty) < 0) {
      throw new ValidationError('Counted quantity must be 0 or greater', 'counted_qty');
    }
    if (!reason || reason.trim().length === 0) {
      throw new ValidationError('Adjustment reason is mandatory', 'reason');
    }

    const adjustment = StockService.createAdjustment({
      productId: product_id,
      locationId: location_id,
      countedQty: Number(counted_qty),
      reason: reason.trim(),
      userId: req.user!.id
    });

    res.status(201).json(adjustment);
  } catch (err) {
    next(err);
  }
});
