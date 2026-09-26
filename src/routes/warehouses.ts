import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { getDb } from '../db/database';
import { authenticate } from '../middleware/auth';
import { requireManager } from '../middleware/rbac';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors';

export const warehousesRouter = Router();

// GET /warehouses
warehousesRouter.get('/', authenticate, (_req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const warehouses = db.prepare(`
      SELECT
        w.id, w.name, w.code, w.address, w.created_at,
        COUNT(DISTINCT l.id) as locations_count,
        COALESCE(SUM(sl.qty), 0) as total_stock
      FROM warehouses w
      LEFT JOIN locations l ON w.id = l.warehouse_id
      LEFT JOIN stock_levels sl ON l.id = sl.location_id
      GROUP BY w.id
      ORDER BY w.name ASC
    `).all();

    res.status(200).json({
      data: warehouses,
      next_cursor: null
    });
  } catch (err) {
    next(err);
  }
});

// POST /warehouses (Manager only)
warehousesRouter.post('/', authenticate, requireManager, (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, code, address } = req.body;

    if (!name || name.trim().length === 0) {
      throw new ValidationError('Warehouse name is required', 'name');
    }
    if (!code || code.trim().length === 0) {
      throw new ValidationError('Warehouse code is required', 'code');
    }

    const cleanCode = code.trim().toUpperCase();
    const db = getDb();

    const existing = db.prepare('SELECT id FROM warehouses WHERE code = ?').get(cleanCode);
    if (existing) {
      throw new ConflictError('A warehouse with this code already exists', 'code');
    }

    const id = crypto.randomUUID();
    db.prepare(`
      INSERT INTO warehouses (id, name, code, address, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).run(id, name.trim(), cleanCode, address?.trim() || null);

    const created = db.prepare('SELECT * FROM warehouses WHERE id = ?').get(id);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

// PATCH /warehouses/:id (Manager only)
warehousesRouter.patch('/:id', authenticate, requireManager, (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const db = getDb();

    const existing = db.prepare('SELECT * FROM warehouses WHERE id = ?').get(id) as any;
    if (!existing) {
      throw new NotFoundError('Warehouse not found');
    }

    const name = req.body.name !== undefined ? req.body.name.trim() : existing.name;
    const code = req.body.code !== undefined ? req.body.code.trim().toUpperCase() : existing.code;
    const address = req.body.address !== undefined ? req.body.address.trim() : existing.address;

    if (code !== existing.code) {
      const duplicate = db.prepare('SELECT id FROM warehouses WHERE code = ? AND id != ?').get(code, id);
      if (duplicate) {
        throw new ConflictError('A warehouse with this code already exists', 'code');
      }
    }

    db.prepare(`
      UPDATE warehouses
      SET name = ?, code = ?, address = ?
      WHERE id = ?
    `).run(name, code, address, id);

    const updated = db.prepare('SELECT * FROM warehouses WHERE id = ?').get(id);
    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /warehouses/:id (Manager only)
warehousesRouter.delete('/:id', authenticate, requireManager, (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const db = getDb();

    // Check if warehouse has live stock
    const stockCheck = db.prepare(`
      SELECT COALESCE(SUM(sl.qty), 0) as total_stock
      FROM locations l
      JOIN stock_levels sl ON l.id = sl.location_id
      WHERE l.warehouse_id = ?
    `).get(id) as { total_stock: number };

    if (stockCheck && stockCheck.total_stock > 0) {
      throw new ConflictError('Cannot delete warehouse with active stock in its locations. Reconcile or transfer stock first.');
    }

    db.prepare('DELETE FROM warehouses WHERE id = ?').run(id);
    res.status(200).json({ message: 'Warehouse deleted successfully' });
  } catch (err) {
    next(err);
  }
});
