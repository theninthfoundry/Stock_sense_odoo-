import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { getDb } from '../db/database';
import { authenticate } from '../middleware/auth';
import { requireManager } from '../middleware/rbac';
import { ConflictError, ValidationError } from '../utils/errors';

export const categoriesRouter = Router();

// GET /categories
categoriesRouter.get('/', authenticate, (_req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const categories = db.prepare(`
      SELECT c.id, c.name, c.created_at, COUNT(p.id) as products_count
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id
      GROUP BY c.id
      ORDER BY c.name ASC
    `).all();

    res.status(200).json({
      data: categories,
      next_cursor: null
    });
  } catch (err) {
    next(err);
  }
});

// POST /categories (Manager only)
categoriesRouter.post('/', authenticate, requireManager, (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name } = req.body;
    if (!name || name.trim().length === 0) {
      throw new ValidationError('Category name is required', 'name');
    }

    const cleanName = name.trim();
    const db = getDb();

    const existing = db.prepare('SELECT id FROM categories WHERE name = ? COLLATE NOCASE').get(cleanName);
    if (existing) {
      throw new ConflictError('A category with this name already exists', 'name');
    }

    const id = crypto.randomUUID();
    db.prepare('INSERT INTO categories (id, name, created_at) VALUES (?, ?, datetime("now"))').run(id, cleanName);

    const created = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});
