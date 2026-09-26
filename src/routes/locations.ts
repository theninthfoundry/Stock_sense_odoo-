import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { getDb } from '../db/database';
import { authenticate } from '../middleware/auth';
import { requireManager } from '../middleware/rbac';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors';

export const locationsRouter = Router();

// GET /locations
locationsRouter.get('/', authenticate, (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const warehouseId = req.query.warehouse_id as string;

    let query = `
      SELECT
        l.id, l.warehouse_id, w.name as warehouse_name, w.code as warehouse_code,
        l.name, l.code, l.created_at,
        COALESCE(SUM(sl.qty), 0) as total_stock
      FROM locations l
      JOIN warehouses w ON l.warehouse_id = w.id
      LEFT JOIN stock_levels sl ON l.id = sl.location_id
    `;

    const where: string[] = [];
    const params: any[] = [];

    if (warehouseId) {
      where.push('l.warehouse_id = ?');
      params.push(warehouseId);
    }

    if (where.length > 0) {
      query += ` WHERE ${where.join(' AND ')}`;
    }

    query += ' GROUP BY l.id ORDER BY w.name ASC, l.name ASC';

    const locations = db.prepare(query).all(...params);

    res.status(200).json({
      data: locations,
      next_cursor: null
    });
  } catch (err) {
    next(err);
  }
});

// POST /locations (Manager only)
locationsRouter.post('/', authenticate, requireManager, (req: Request, res: Response, next: NextFunction) => {
  try {
    const { warehouse_id, name, code } = req.body;

    if (!warehouse_id) {
      throw new ValidationError('Warehouse ID is required', 'warehouse_id');
    }
    if (!name || name.trim().length === 0) {
      throw new ValidationError('Location name is required', 'name');
    }
    if (!code || code.trim().length === 0) {
      throw new ValidationError('Location code is required', 'code');
    }

    const cleanCode = code.trim().toUpperCase();
    const db = getDb();

    const wh = db.prepare('SELECT id FROM warehouses WHERE id = ?').get(warehouse_id);
    if (!wh) {
      throw new NotFoundError('Warehouse not found', 'warehouse_id');
    }

    const existing = db.prepare('SELECT id FROM locations WHERE warehouse_id = ? AND code = ?').get(warehouse_id, cleanCode);
    if (existing) {
      throw new ConflictError('A location with this code already exists in this warehouse', 'code');
    }

    const id = crypto.randomUUID();
    db.prepare(`
      INSERT INTO locations (id, warehouse_id, name, code, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).run(id, warehouse_id, name.trim(), cleanCode);

    const created = db.prepare('SELECT * FROM locations WHERE id = ?').get(id);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

// PATCH /locations/:id (Manager only)
locationsRouter.patch('/:id', authenticate, requireManager, (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const db = getDb();

    const existing = db.prepare('SELECT * FROM locations WHERE id = ?').get(id) as any;
    if (!existing) {
      throw new NotFoundError('Location not found');
    }

    const name = req.body.name !== undefined ? req.body.name.trim() : existing.name;
    const code = req.body.code !== undefined ? req.body.code.trim().toUpperCase() : existing.code;

    if (code !== existing.code) {
      const duplicate = db.prepare('SELECT id FROM locations WHERE warehouse_id = ? AND code = ? AND id != ?').get(existing.warehouse_id, code, id);
      if (duplicate) {
        throw new ConflictError('A location with this code already exists in this warehouse', 'code');
      }
    }

    db.prepare(`
      UPDATE locations
      SET name = ?, code = ?
      WHERE id = ?
    `).run(name, code, id);

    const updated = db.prepare('SELECT * FROM locations WHERE id = ?').get(id);
    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /locations/:id (Manager only)
locationsRouter.delete('/:id', authenticate, requireManager, (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const db = getDb();

    // Check if location has active stock
    const stockCheck = db.prepare(`
      SELECT COALESCE(SUM(qty), 0) as total_stock
      FROM stock_levels
      WHERE location_id = ?
    `).get(id) as { total_stock: number };

    if (stockCheck && stockCheck.total_stock > 0) {
      throw new ConflictError('Cannot delete location with active stock. Transfer or adjust stock to 0 first.');
    }

    db.prepare('DELETE FROM locations WHERE id = ?').run(id);
    res.status(200).json({ message: 'Location deleted successfully' });
  } catch (err) {
    next(err);
  }
});
