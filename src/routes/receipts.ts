import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { getDb } from '../db/database';
import { authenticate } from '../middleware/auth';
import { enforceWarehouseScope } from '../middleware/rbac';
import { handleIdempotency } from '../middleware/idempotency';
import { StockService } from '../services/stockService';
import { NotFoundError, ValidationError } from '../utils/errors';

export const receiptsRouter = Router();

// GET /receipts
receiptsRouter.get('/', authenticate, (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const warehouseId = req.query.warehouse_id as string;
    const status = req.query.status as string;

    let query = `
      SELECT
        r.id, r.status, r.warehouse_id, w.name as warehouse_name,
        r.party, r.reference, r.created_by, u.name as created_by_name,
        r.validated_at, r.created_at,
        COUNT(rl.id) as total_lines,
        COALESCE(SUM(rl.received_qty), 0) as total_received_qty
      FROM receipts r
      JOIN warehouses w ON r.warehouse_id = w.id
      JOIN users u ON r.created_by = u.id
      LEFT JOIN receipt_lines rl ON r.id = rl.receipt_id
    `;

    const where: string[] = [];
    const params: any[] = [];

    // RBAC: If staff, enforce assigned warehouse
    if (req.user?.role === 'warehouse_staff' && req.user.warehouse_id) {
      where.push('r.warehouse_id = ?');
      params.push(req.user.warehouse_id);
    } else if (warehouseId) {
      where.push('r.warehouse_id = ?');
      params.push(warehouseId);
    }

    if (status) {
      where.push('r.status = ?');
      params.push(status);
    }

    if (where.length > 0) {
      query += ` WHERE ${where.join(' AND ')}`;
    }

    query += ' GROUP BY r.id ORDER BY r.created_at DESC';

    const receipts = db.prepare(query).all(...params);

    res.status(200).json({
      data: receipts,
      next_cursor: null
    });
  } catch (err) {
    next(err);
  }
});

// GET /receipts/:id
receiptsRouter.get('/:id', authenticate, (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const receipt = db.prepare(`
      SELECT r.*, w.name as warehouse_name, u.name as created_by_name
      FROM receipts r
      JOIN warehouses w ON r.warehouse_id = w.id
      JOIN users u ON r.created_by = u.id
      WHERE r.id = ?
    `).get(req.params.id) as any;

    if (!receipt) {
      throw new NotFoundError('Receipt not found');
    }

    enforceWarehouseScope(receipt.warehouse_id, req);

    const lines = db.prepare(`
      SELECT
        rl.*,
        p.sku as product_sku,
        p.name as product_name,
        p.uom,
        l.name as location_name,
        l.code as location_code
      FROM receipt_lines rl
      JOIN products p ON rl.product_id = p.id
      JOIN locations l ON rl.location_id = l.id
      WHERE rl.receipt_id = ?
    `).all(req.params.id);

    res.status(200).json({
      ...receipt,
      lines
    });
  } catch (err) {
    next(err);
  }
});

// POST /receipts - Create Draft Receipt
receiptsRouter.post('/', authenticate, (req: Request, res: Response, next: NextFunction) => {
  try {
    const { warehouse_id, party, reference, status = 'draft', lines = [] } = req.body;

    if (!warehouse_id) {
      throw new ValidationError('Warehouse is required', 'warehouse_id');
    }
    if (!party || party.trim().length === 0) {
      throw new ValidationError('Supplier/Party is required', 'party');
    }
    if (!Array.isArray(lines) || lines.length === 0) {
      throw new ValidationError('Receipt must include at least one item line', 'lines');
    }

    enforceWarehouseScope(warehouse_id, req);

    const db = getDb();
    const receiptId = crypto.randomUUID();

    const insertReceipt = db.transaction(() => {
      db.prepare(`
        INSERT INTO receipts (id, status, warehouse_id, party, reference, created_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(receiptId, status, warehouse_id, party.trim(), reference?.trim() || null, req.user!.id);

      const insertLine = db.prepare(`
        INSERT INTO receipt_lines (id, receipt_id, product_id, location_id, expected_qty, received_qty)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const line of lines) {
        if (!line.product_id) throw new ValidationError('Product is required on all lines', 'product_id');
        if (!line.location_id) throw new ValidationError('Location is required on all lines', 'location_id');
        if (line.expected_qty === undefined || line.expected_qty < 0) {
          throw new ValidationError('Expected quantity cannot be negative', 'expected_qty');
        }
        const receivedQty = line.received_qty !== undefined ? line.received_qty : line.expected_qty;

        insertLine.run(
          crypto.randomUUID(),
          receiptId,
          line.product_id,
          line.location_id,
          line.expected_qty,
          receivedQty
        );
      }

      return db.prepare('SELECT * FROM receipts WHERE id = ?').get(receiptId);
    });

    const receipt = insertReceipt();
    res.status(201).json(receipt);
  } catch (err) {
    next(err);
  }
});

// POST /receipts/:id/validate - Idempotent, Atomic DB Transaction
receiptsRouter.post('/:id/validate', authenticate, handleIdempotency, (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const receipt = db.prepare('SELECT warehouse_id FROM receipts WHERE id = ?').get(req.params.id) as { warehouse_id: string } | undefined;

    if (!receipt) {
      throw new NotFoundError('Receipt not found');
    }

    enforceWarehouseScope(receipt.warehouse_id, req);

    const validated = StockService.validateReceipt(req.params.id, req.user!.id);
    res.status(200).json(validated);
  } catch (err) {
    next(err);
  }
});
