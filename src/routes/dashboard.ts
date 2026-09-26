import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { DashboardService } from '../services/dashboardService';
import { getDb } from '../db/database';

export const dashboardRouter = Router();

// GET /dashboard/kpis
dashboardRouter.get('/kpis', authenticate, (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters = {
      type: req.query.type as string,
      status: req.query.status as string,
      warehouse: req.query.warehouse as string,
      category: req.query.category as string
    };

    const kpis = DashboardService.getKpis(filters);
    res.status(200).json(kpis);
  } catch (err) {
    next(err);
  }
});

// GET /dashboard/operations
dashboardRouter.get('/operations', authenticate, (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters = {
      type: req.query.type as string,
      status: req.query.status as string,
      warehouse: req.query.warehouse as string,
      category: req.query.category as string
    };

    const operations = DashboardService.getOperations(filters);
    res.status(200).json({
      data: operations,
      next_cursor: null
    });
  } catch (err) {
    next(err);
  }
});

// GET /dashboard/ledger - Audit trail
dashboardRouter.get('/ledger', authenticate, (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const productId = req.query.product_id as string;
    const locationId = req.query.location_id as string;

    let query = `
      SELECT
        sl.id, sl.product_id, p.name as product_name, p.sku as product_sku, p.uom,
        sl.location_id, l.name as location_name, l.code as location_code,
        w.name as warehouse_name,
        sl.delta, sl.doc_type, sl.doc_id,
        sl.created_by, u.name as created_by_name,
        sl.created_at
      FROM stock_ledgers sl
      JOIN products p ON sl.product_id = p.id
      JOIN locations l ON sl.location_id = l.id
      JOIN warehouses w ON l.warehouse_id = w.id
      JOIN users u ON sl.created_by = u.id
    `;

    const where: string[] = [];
    const params: any[] = [];

    if (productId) {
      where.push('sl.product_id = ?');
      params.push(productId);
    }
    if (locationId) {
      where.push('sl.location_id = ?');
      params.push(locationId);
    }

    if (where.length > 0) {
      query += ` WHERE ${where.join(' AND ')}`;
    }

    query += ' ORDER BY sl.created_at DESC LIMIT 100';

    const rows = db.prepare(query).all(...params);

    res.status(200).json({
      data: rows,
      next_cursor: null
    });
  } catch (err) {
    next(err);
  }
});
