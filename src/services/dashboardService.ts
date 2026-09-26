import { getDb } from '../db/database';

export interface DashboardFilter {
  type?: string;
  status?: string;
  warehouse?: string;
  category?: string;
}

export class DashboardService {
  /**
   * GET /dashboard/kpis
   * Computed strictly from cached stock_levels and summary tables (never scanning entire ledger).
   */
  public static getKpis(filters: DashboardFilter) {
    const db = getDb();

    // Base query conditions for stock levels
    const conditions: string[] = [];
    const params: any[] = [];

    if (filters.warehouse) {
      conditions.push('l.warehouse_id = ?');
      params.push(filters.warehouse);
    }

    if (filters.category) {
      conditions.push('p.category_id = ?');
      params.push(filters.category);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Total stock quantity across matching products & locations
    const stockQuery = `
      SELECT
        COALESCE(SUM(sl.qty), 0) as total_stock_qty,
        COUNT(DISTINCT p.id) as total_products
      FROM products p
      LEFT JOIN stock_levels sl ON p.id = sl.product_id
      LEFT JOIN locations l ON sl.location_id = l.id
      ${whereClause}
    `;
    const stockRow = db.prepare(stockQuery).get(...params) as {
      total_stock_qty: number;
      total_products: number;
    };

    // Low stock count (products where total stock <= reorder_min and reorder_min > 0)
    const lowStockQuery = `
      SELECT COUNT(*) as low_stock_count FROM (
        SELECT p.id, p.reorder_min, COALESCE(SUM(sl.qty), 0) as current_qty
        FROM products p
        LEFT JOIN stock_levels sl ON p.id = sl.product_id
        LEFT JOIN locations l ON sl.location_id = l.id
        ${whereClause}
        GROUP BY p.id, p.reorder_min
        HAVING current_qty <= p.reorder_min AND p.reorder_min > 0
      )
    `;
    const lowStockRow = db.prepare(lowStockQuery).get(...params) as { low_stock_count: number };

    // Out of stock count (products with 0 or less stock)
    const outOfStockQuery = `
      SELECT COUNT(*) as out_of_stock_count FROM (
        SELECT p.id, COALESCE(SUM(sl.qty), 0) as current_qty
        FROM products p
        LEFT JOIN stock_levels sl ON sl.product_id = p.id
        LEFT JOIN locations l ON sl.location_id = l.id
        ${whereClause}
        GROUP BY p.id
        HAVING current_qty <= 0
      )
    `;
    const outOfStockRow = db.prepare(outOfStockQuery).get(...params) as { out_of_stock_count: number };

    // Pending operations (receipts & deliveries in 'waiting' or 'ready' or 'draft' status)
    let pendingReceiptsQuery = "SELECT COUNT(*) as count FROM receipts WHERE status IN ('waiting', 'ready')";
    const pendingReceiptsParams: any[] = [];
    if (filters.warehouse) {
      pendingReceiptsQuery += ' AND warehouse_id = ?';
      pendingReceiptsParams.push(filters.warehouse);
    }
    const pendingReceipts = db.prepare(pendingReceiptsQuery).get(...pendingReceiptsParams) as { count: number };

    let pendingDeliveriesQuery = "SELECT COUNT(*) as count FROM delivery_orders WHERE status IN ('waiting', 'ready')";
    const pendingDeliveriesParams: any[] = [];
    if (filters.warehouse) {
      pendingDeliveriesQuery += ' AND warehouse_id = ?';
      pendingDeliveriesParams.push(filters.warehouse);
    }
    const pendingDeliveries = db.prepare(pendingDeliveriesQuery).get(...pendingDeliveriesParams) as { count: number };

    let pendingTransfersQuery = "SELECT COUNT(*) as count FROM transfers WHERE status IN ('waiting', 'ready')";
    const pendingTransfers = db.prepare(pendingTransfersQuery).get() as { count: number };

    return {
      total_stock_qty: stockRow.total_stock_qty,
      total_products: stockRow.total_products,
      low_stock_count: lowStockRow.low_stock_count,
      out_of_stock_count: outOfStockRow.out_of_stock_count,
      pending_receipts: pendingReceipts.count,
      pending_deliveries: pendingDeliveries.count,
      pending_transfers: pendingTransfers.count,
      total_pending_ops: pendingReceipts.count + pendingDeliveries.count + pendingTransfers.count
    };
  }

  /**
   * Tabbed operations list with filtering support.
   */
  public static getOperations(filters: DashboardFilter) {
    const db = getDb();
    const ops: any[] = [];

    // Receipts
    if (!filters.type || filters.type === 'receipt') {
      let q = `
        SELECT r.id, 'receipt' as type, r.status, r.warehouse_id, w.name as warehouse_name,
               r.party, r.reference, r.created_at, r.validated_at, u.name as created_by_name
        FROM receipts r
        JOIN warehouses w ON r.warehouse_id = w.id
        JOIN users u ON r.created_by = u.id
      `;
      const p: any[] = [];
      const conds: string[] = [];
      if (filters.status) { conds.push('r.status = ?'); p.push(filters.status); }
      if (filters.warehouse) { conds.push('r.warehouse_id = ?'); p.push(filters.warehouse); }
      if (conds.length) q += ` WHERE ${conds.join(' AND ')}`;
      q += ' ORDER BY r.created_at DESC LIMIT 20';
      const rows = db.prepare(q).all(...p);
      ops.push(...rows);
    }

    // Deliveries
    if (!filters.type || filters.type === 'delivery') {
      let q = `
        SELECT d.id, 'delivery' as type, d.status, d.warehouse_id, w.name as warehouse_name,
               d.party, d.reference, d.created_at, d.validated_at, u.name as created_by_name
        FROM delivery_orders d
        JOIN warehouses w ON d.warehouse_id = w.id
        JOIN users u ON d.created_by = u.id
      `;
      const p: any[] = [];
      const conds: string[] = [];
      if (filters.status) { conds.push('d.status = ?'); p.push(filters.status); }
      if (filters.warehouse) { conds.push('d.warehouse_id = ?'); p.push(filters.warehouse); }
      if (conds.length) q += ` WHERE ${conds.join(' AND ')}`;
      q += ' ORDER BY d.created_at DESC LIMIT 20';
      const rows = db.prepare(q).all(...p);
      ops.push(...rows);
    }

    // Transfers
    if (!filters.type || filters.type === 'transfer') {
      let q = `
        SELECT t.id, 'transfer' as type, t.status, p.name as product_name, t.qty,
               fl.name as from_location_name, tl.name as to_location_name,
               t.created_at, t.validated_at, u.name as created_by_name
        FROM transfers t
        JOIN products p ON t.product_id = p.id
        JOIN locations fl ON t.from_location_id = fl.id
        JOIN locations tl ON t.to_location_id = tl.id
        JOIN users u ON t.created_by = u.id
      `;
      const p: any[] = [];
      const conds: string[] = [];
      if (filters.status) { conds.push('t.status = ?'); p.push(filters.status); }
      if (conds.length) q += ` WHERE ${conds.join(' AND ')}`;
      q += ' ORDER BY t.created_at DESC LIMIT 20';
      const rows = db.prepare(q).all(...p);
      ops.push(...rows);
    }

    // Sort all combined operations by created_at DESC
    ops.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return ops;
  }
}
