import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { getDb } from '../db/database';
import { authenticate } from '../middleware/auth';
import { requireManager } from '../middleware/rbac';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors';

export const productsRouter = Router();

// GET /products - List products with total stock, location details, and search
productsRouter.get('/', authenticate, (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const search = (req.query.search as string || req.query.sku as string || '').trim();
    const categoryId = req.query.category_id as string;
    const lowStockOnly = req.query.low_stock === 'true';

    let query = `
      SELECT
        p.id, p.sku, p.name, p.category_id, c.name as category_name,
        p.uom, p.reorder_min, p.reorder_max, p.created_at,
        COALESCE(SUM(sl.qty), 0) as total_stock
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN stock_levels sl ON p.id = sl.product_id
    `;

    const whereConditions: string[] = [];
    const params: any[] = [];

    if (search) {
      whereConditions.push('(p.sku LIKE ? OR p.name LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    if (categoryId) {
      whereConditions.push('p.category_id = ?');
      params.push(categoryId);
    }

    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    query += ' GROUP BY p.id ORDER BY p.sku ASC';

    const rows = db.prepare(query).all(...params) as any[];

    // Map rows and compute low_stock flag
    const data = rows
      .map(row => ({
        ...row,
        total_stock: Number(row.total_stock),
        is_low_stock: row.reorder_min > 0 && Number(row.total_stock) <= row.reorder_min,
        is_out_of_stock: Number(row.total_stock) <= 0
      }))
      .filter(p => !lowStockOnly || p.is_low_stock);

    res.status(200).json({
      data,
      next_cursor: null
    });
  } catch (err) {
    next(err);
  }
});

// GET /products/:id/stock - Stock by location breakdown
productsRouter.get('/:id/stock', authenticate, (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const productId = req.params.id;

    const product = db.prepare('SELECT id, sku, name, uom, reorder_min, reorder_max FROM products WHERE id = ?').get(productId);
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    const locationsStock = db.prepare(`
      SELECT
        l.id as location_id,
        l.name as location_name,
        l.code as location_code,
        w.id as warehouse_id,
        w.name as warehouse_name,
        COALESCE(sl.qty, 0) as qty,
        sl.updated_at
      FROM locations l
      JOIN warehouses w ON l.warehouse_id = w.id
      LEFT JOIN stock_levels sl ON sl.location_id = l.id AND sl.product_id = ?
      ORDER BY w.name ASC, l.name ASC
    `).all(productId) as any[];

    const totalStock = locationsStock.reduce((acc, curr) => acc + curr.qty, 0);

    res.status(200).json({
      product,
      total_stock: totalStock,
      locations: locationsStock
    });
  } catch (err) {
    next(err);
  }
});

// POST /products - Create product (Manager only)
productsRouter.post('/', authenticate, requireManager, (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sku, name, category_id, uom = 'Units', reorder_min = 0, reorder_max = 0 } = req.body;

    if (!sku || sku.trim().length === 0) {
      throw new ValidationError('SKU is required', 'sku');
    }
    if (!name || name.trim().length === 0) {
      throw new ValidationError('Product name is required', 'name');
    }
    if (!category_id) {
      throw new ValidationError('Category is required', 'category_id');
    }
    if (reorder_min < 0) {
      throw new ValidationError('Reorder minimum cannot be negative', 'reorder_min');
    }
    if (reorder_max > 0 && reorder_min >= reorder_max) {
      throw new ValidationError('Reorder maximum must be strictly greater than reorder minimum', 'reorder_max');
    }

    const db = getDb();
    const existingSku = db.prepare('SELECT id FROM products WHERE sku = ?').get(sku.trim().toUpperCase());
    if (existingSku) {
      throw new ConflictError('A product with this SKU already exists', 'sku');
    }

    const cat = db.prepare('SELECT id FROM categories WHERE id = ?').get(category_id);
    if (!cat) {
      throw new NotFoundError('Selected category does not exist', 'category_id');
    }

    const id = crypto.randomUUID();
    const cleanSku = sku.trim().toUpperCase();

    db.prepare(`
      INSERT INTO products (id, sku, name, category_id, uom, reorder_min, reorder_max, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(id, cleanSku, name.trim(), category_id, uom.trim(), reorder_min, reorder_max);

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
});

// PATCH /products/:id - Edit product (Manager only)
productsRouter.patch('/:id', authenticate, requireManager, (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const db = getDb();

    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as any;
    if (!existing) {
      throw new NotFoundError('Product not found');
    }

    const sku = req.body.sku !== undefined ? req.body.sku.trim().toUpperCase() : existing.sku;
    const name = req.body.name !== undefined ? req.body.name.trim() : existing.name;
    const category_id = req.body.category_id !== undefined ? req.body.category_id : existing.category_id;
    const uom = req.body.uom !== undefined ? req.body.uom.trim() : existing.uom;
    const reorder_min = req.body.reorder_min !== undefined ? Number(req.body.reorder_min) : existing.reorder_min;
    const reorder_max = req.body.reorder_max !== undefined ? Number(req.body.reorder_max) : existing.reorder_max;

    if (sku !== existing.sku) {
      const duplicate = db.prepare('SELECT id FROM products WHERE sku = ? AND id != ?').get(sku, id);
      if (duplicate) {
        throw new ConflictError('A product with this SKU already exists', 'sku');
      }
    }

    if (reorder_min < 0) {
      throw new ValidationError('Reorder minimum cannot be negative', 'reorder_min');
    }

    if (reorder_max > 0 && reorder_min >= reorder_max) {
      throw new ValidationError('Reorder maximum must be strictly greater than reorder minimum', 'reorder_max');
    }

    db.prepare(`
      UPDATE products
      SET sku = ?, name = ?, category_id = ?, uom = ?, reorder_min = ?, reorder_max = ?
      WHERE id = ?
    `).run(sku, name, category_id, uom, reorder_min, reorder_max, id);

    const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
});
