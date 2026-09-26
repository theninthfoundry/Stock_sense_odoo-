import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { getDb } from '../db/database';
import { authenticate } from '../middleware/auth';
import { handleIdempotency } from '../middleware/idempotency';
import { StockService } from '../services/stockService';
import { NotFoundError, ValidationError, ForbiddenError } from '../utils/errors';

export const transfersRouter = Router();

// GET /transfers
transfersRouter.get('/', authenticate, (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const status = req.query.status as string;
    const productId = req.query.product_id as string;

    let query = `
      SELECT
        t.id, t.status, t.product_id, p.name as product_name, p.sku as product_sku, p.uom,
        t.qty, t.from_location_id, fl.name as from_location_name, fl.code as from_location_code,
        fw.name as from_warehouse_name,
        t.to_location_id, tl.name as to_location_name, tl.code as to_location_code,
        tw.name as to_warehouse_name,
        t.created_by, u.name as created_by_name,
        t.validated_at, t.created_at
      FROM transfers t
      JOIN products p ON t.product_id = p.id
      JOIN locations fl ON t.from_location_id = fl.id
      JOIN warehouses fw ON fl.warehouse_id = fw.id
      JOIN locations tl ON t.to_location_id = tl.id
      JOIN warehouses tw ON tl.warehouse_id = tw.id
      JOIN users u ON t.created_by = u.id
    `;

    const where: string[] = [];
    const params: any[] = [];

    // RBAC: If staff, can see transfers involving their assigned warehouse
    if (req.user?.role === 'warehouse_staff' && req.user.warehouse_id) {
      where.push('(fl.warehouse_id = ? OR tl.warehouse_id = ?)');
      params.push(req.user.warehouse_id, req.user.warehouse_id);
    }

    if (status) {
      where.push('t.status = ?');
      params.push(status);
    }

    if (productId) {
      where.push('t.product_id = ?');
      params.push(productId);
    }

    if (where.length > 0) {
      query += ` WHERE ${where.join(' AND ')}`;
    }

    query += ' ORDER BY t.created_at DESC';

    const transfers = db.prepare(query).all(...params);

    res.status(200).json({
      data: transfers,
      next_cursor: null
    });
  } catch (err) {
    next(err);
  }
});

// GET /transfers/:id
transfersRouter.get('/:id', authenticate, (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const transfer = db.prepare(`
      SELECT
        t.id, t.status, t.product_id, p.name as product_name, p.sku as product_sku, p.uom,
        t.qty, t.from_location_id, fl.name as from_location_name, fl.code as from_location_code,
        fl.warehouse_id as from_warehouse_id, fw.name as from_warehouse_name,
        t.to_location_id, tl.name as to_location_name, tl.code as to_location_code,
        tl.warehouse_id as to_warehouse_id, tw.name as to_warehouse_name,
        t.created_by, u.name as created_by_name,
        t.validated_at, t.created_at,
        COALESCE(sl.qty, 0) as current_available_at_source
      FROM transfers t
      JOIN products p ON t.product_id = p.id
      JOIN locations fl ON t.from_location_id = fl.id
      JOIN warehouses fw ON fl.warehouse_id = fw.id
      JOIN locations tl ON t.to_location_id = tl.id
      JOIN warehouses tw ON tl.warehouse_id = tw.id
      JOIN users u ON t.created_by = u.id
      LEFT JOIN stock_levels sl ON t.product_id = sl.product_id AND t.from_location_id = sl.location_id
      WHERE t.id = ?
    `).get(req.params.id) as any;

    if (!transfer) {
      throw new NotFoundError('Transfer not found');
    }

    if (req.user?.role === 'warehouse_staff' && req.user.warehouse_id) {
      if (transfer.from_warehouse_id !== req.user.warehouse_id && transfer.to_warehouse_id !== req.user.warehouse_id) {
        throw new ForbiddenError('Warehouse staff cannot access transfers outside assigned warehouse');
      }
    }

    res.status(200).json(transfer);
  } catch (err) {
    next(err);
  }
});

// POST /transfers - Create Draft Transfer
transfersRouter.post('/', authenticate, (req: Request, res: Response, next: NextFunction) => {
  try {
    const { product_id, qty, from_location_id, to_location_id, status = 'draft' } = req.body;

    if (!product_id) {
      throw new ValidationError('Product is required', 'product_id');
    }
    if (!from_location_id) {
      throw new ValidationError('Source location is required', 'from_location_id');
    }
    if (!to_location_id) {
      throw new ValidationError('Destination location is required', 'to_location_id');
    }
    if (from_location_id === to_location_id) {
      throw new ValidationError('Source and destination locations cannot be the same', 'to_location_id');
    }
    if (qty === undefined || qty <= 0) {
      throw new ValidationError('Transfer quantity must be greater than zero', 'qty');
    }

    const db = getDb();

    // Verify locations and staff scope
    const fromLoc = db.prepare('SELECT warehouse_id FROM locations WHERE id = ?').get(from_location_id) as { warehouse_id: string } | undefined;
    if (!fromLoc) throw new NotFoundError('Source location not found', 'from_location_id');

    const toLoc = db.prepare('SELECT warehouse_id FROM locations WHERE id = ?').get(to_location_id) as { warehouse_id: string } | undefined;
    if (!toLoc) throw new NotFoundError('Destination location not found', 'to_location_id');

    if (req.user?.role === 'warehouse_staff' && req.user.warehouse_id) {
      if (fromLoc.warehouse_id !== req.user.warehouse_id) {
        throw new ForbiddenError('Warehouse staff can only initiate transfers from their assigned warehouse');
      }
    }

    const transferId = crypto.randomUUID();

    db.prepare(`
      INSERT INTO transfers (id, status, product_id, qty, from_location_id, to_location_id, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(transferId, status, product_id, qty, from_location_id, to_location_id, req.user!.id);

    const created = db.prepare('SELECT * FROM transfers WHERE id = ?').get(transferId);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

// POST /transfers/:id/validate - Idempotent, Atomic DB Transaction
transfersRouter.post('/:id/validate', authenticate, handleIdempotency, (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const transfer = db.prepare(`
      SELECT t.*, fl.warehouse_id as from_warehouse_id
      FROM transfers t
      JOIN locations fl ON t.from_location_id = fl.id
      WHERE t.id = ?
    `).get(req.params.id) as any;

    if (!transfer) {
      throw new NotFoundError('Transfer not found');
    }

    if (req.user?.role === 'warehouse_staff' && req.user.warehouse_id) {
      if (transfer.from_warehouse_id !== req.user.warehouse_id) {
        throw new ForbiddenError('Warehouse staff can only validate transfers originating from their assigned warehouse');
      }
    }

    const validated = StockService.validateTransfer(req.params.id, req.user!.id);
    res.status(200).json(validated);
  } catch (err) {
    next(err);
  }
});
