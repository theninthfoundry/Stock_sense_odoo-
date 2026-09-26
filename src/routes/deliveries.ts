import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { getDb } from '../db/database';
import { authenticate } from '../middleware/auth';
import { enforceWarehouseScope } from '../middleware/rbac';
import { handleIdempotency } from '../middleware/idempotency';
import { StockService } from '../services/stockService';
import { NotFoundError, ValidationError } from '../utils/errors';

export const deliveriesRouter = Router();

// GET /deliveries
deliveriesRouter.get('/', authenticate, (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const warehouseId = req.query.warehouse_id as string;
    const status = req.query.status as string;

    let query = `
      SELECT
        d.id, d.status, d.warehouse_id, w.name as warehouse_name,
        d.party, d.reference, d.created_by, u.name as created_by_name,
        d.validated_at, d.created_at,
        COUNT(dl.id) as total_lines,
        COALESCE(SUM(dl.picked_qty), 0) as total_picked_qty
      FROM delivery_orders d
      JOIN warehouses w ON d.warehouse_id = w.id
      JOIN users u ON d.created_by = u.id
      LEFT JOIN delivery_lines dl ON d.id = dl.delivery_id
    `;

    const where: string[] = [];
    const params: any[] = [];

    // RBAC: If staff, enforce assigned warehouse
    if (req.user?.role === 'warehouse_staff' && req.user.warehouse_id) {
      where.push('d.warehouse_id = ?');
      params.push(req.user.warehouse_id);
    } else if (warehouseId) {
      where.push('d.warehouse_id = ?');
      params.push(warehouseId);
    }

    if (status) {
      where.push('d.status = ?');
      params.push(status);
    }

    if (where.length > 0) {
      query += ` WHERE ${where.join(' AND ')}`;
    }

    query += ' GROUP BY d.id ORDER BY d.created_at DESC';

    const deliveries = db.prepare(query).all(...params);

    res.status(200).json({
      data: deliveries,
      next_cursor: null
    });
  } catch (err) {
    next(err);
  }
});

// GET /deliveries/:id
deliveriesRouter.get('/:id', authenticate, (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const delivery = db.prepare(`
      SELECT d.*, w.name as warehouse_name, u.name as created_by_name
      FROM delivery_orders d
      JOIN warehouses w ON d.warehouse_id = w.id
      JOIN users u ON d.created_by = u.id
      WHERE d.id = ?
    `).get(req.params.id) as any;

    if (!delivery) {
      throw new NotFoundError('Delivery order not found');
    }

    enforceWarehouseScope(delivery.warehouse_id, req);

    const lines = db.prepare(`
      SELECT
        dl.*,
        p.sku as product_sku,
        p.name as product_name,
        p.uom,
        l.name as location_name,
        l.code as location_code,
        COALESCE(sl.qty, 0) as current_available_stock
      FROM delivery_lines dl
      JOIN products p ON dl.product_id = p.id
      JOIN locations l ON dl.location_id = l.id
      LEFT JOIN stock_levels sl ON dl.product_id = sl.product_id AND dl.location_id = sl.location_id
      WHERE dl.delivery_id = ?
    `).all(req.params.id);

    res.status(200).json({
      ...delivery,
      lines
    });
  } catch (err) {
    next(err);
  }
});

// POST /deliveries - Create Draft Delivery Order
deliveriesRouter.post('/', authenticate, (req: Request, res: Response, next: NextFunction) => {
  try {
    const { warehouse_id, party, reference, status = 'draft', lines = [] } = req.body;

    if (!warehouse_id) {
      throw new ValidationError('Warehouse is required', 'warehouse_id');
    }
    if (!party || party.trim().length === 0) {
      throw new ValidationError('Customer/Party is required', 'party');
    }
    if (!Array.isArray(lines) || lines.length === 0) {
      throw new ValidationError('Delivery order must include at least one item line', 'lines');
    }

    enforceWarehouseScope(warehouse_id, req);

    const db = getDb();
    const deliveryId = crypto.randomUUID();

    const insertDelivery = db.transaction(() => {
      db.prepare(`
        INSERT INTO delivery_orders (id, status, warehouse_id, party, reference, created_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(deliveryId, status, warehouse_id, party.trim(), reference?.trim() || null, req.user!.id);

      const insertLine = db.prepare(`
        INSERT INTO delivery_lines (id, delivery_id, product_id, location_id, expected_qty, picked_qty)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const line of lines) {
        if (!line.product_id) throw new ValidationError('Product is required on all lines', 'product_id');
        if (!line.location_id) throw new ValidationError('Location is required on all lines', 'location_id');
        if (line.expected_qty === undefined || line.expected_qty <= 0) {
          throw new ValidationError('Expected quantity must be greater than zero', 'expected_qty');
        }
        const pickedQty = line.picked_qty !== undefined ? line.picked_qty : line.expected_qty;

        insertLine.run(
          crypto.randomUUID(),
          deliveryId,
          line.product_id,
          line.location_id,
          line.expected_qty,
          pickedQty
        );
      }

      return db.prepare('SELECT * FROM delivery_orders WHERE id = ?').get(deliveryId);
    });

    const delivery = insertDelivery();
    res.status(201).json(delivery);
  } catch (err) {
    next(err);
  }
});

// POST /deliveries/:id/validate - Idempotent, Atomic DB Transaction
deliveriesRouter.post('/:id/validate', authenticate, handleIdempotency, (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const delivery = db.prepare('SELECT warehouse_id FROM delivery_orders WHERE id = ?').get(req.params.id) as { warehouse_id: string } | undefined;

    if (!delivery) {
      throw new NotFoundError('Delivery order not found');
    }

    enforceWarehouseScope(delivery.warehouse_id, req);

    const validated = StockService.validateDelivery(req.params.id, req.user!.id);
    res.status(200).json(validated);
  } catch (err) {
    next(err);
  }
});
