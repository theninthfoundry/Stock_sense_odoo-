import crypto from 'crypto';
import { getDb } from '../db/database';
import {
  ConflictError,
  InsufficientStockError,
  NotFoundError,
  ValidationError
} from '../utils/errors';
import { DocumentStatus } from '../types';

export class StockService {
  /**
   * Get the true stock level derived directly from SUM(ledger.delta).
   */
  public static getLedgerStock(productId: string, locationId: string): number {
    const db = getDb();
    const row = db
      .prepare('SELECT COALESCE(SUM(delta), 0) as total FROM stock_ledgers WHERE product_id = ? AND location_id = ?')
      .get(productId, locationId) as { total: number };
    return row.total;
  }

  /**
   * Recomputes and updates the cached StockLevel row from SUM(ledger.delta) inside the active transaction.
   */
  public static refreshCachedStockLevel(productId: string, locationId: string): number {
    const db = getDb();
    const updateStmt = db.prepare(`
      INSERT INTO stock_levels (product_id, location_id, qty, updated_at)
      VALUES (?, ?, (SELECT COALESCE(SUM(delta), 0) FROM stock_ledgers WHERE product_id = ? AND location_id = ?), datetime('now'))
      ON CONFLICT(product_id, location_id) DO UPDATE SET
        qty = (SELECT COALESCE(SUM(delta), 0) FROM stock_ledgers WHERE product_id = excluded.product_id AND location_id = excluded.location_id),
        updated_at = datetime('now')
    `);
    updateStmt.run(productId, locationId, productId, locationId);

    const level = db
      .prepare('SELECT qty FROM stock_levels WHERE product_id = ? AND location_id = ?')
      .get(productId, locationId) as { qty: number };
    return level.qty;
  }

  /**
   * Check if a product is currently below or equal to reorder_min.
   */
  public static checkLowStock(productId: string): { isLowStock: boolean; currentTotal: number; reorderMin: number } {
    const db = getDb();
    const prod = db
      .prepare('SELECT reorder_min FROM products WHERE id = ?')
      .get(productId) as { reorder_min: number } | undefined;
    if (!prod) return { isLowStock: false, currentTotal: 0, reorderMin: 0 };

    const totalRow = db
      .prepare('SELECT COALESCE(SUM(qty), 0) as total FROM stock_levels WHERE product_id = ?')
      .get(productId) as { total: number };

    return {
      isLowStock: totalRow.total <= prod.reorder_min,
      currentTotal: totalRow.total,
      reorderMin: prod.reorder_min
    };
  }

  /**
   * VALIDATE RECEIPT:
   * Atomic transaction:
   * - Check receipt status (must be draft/waiting/ready)
   * - For each line: append ledger row with +received_qty
   * - Recompute cached StockLevel from SUM(ledger.delta)
   * - Update receipt status to 'done', set validated_at
   */
  public static validateReceipt(receiptId: string, userId: string) {
    const db = getDb();

    const runValidation = db.transaction(() => {
      const receipt = db
        .prepare('SELECT id, status, warehouse_id FROM receipts WHERE id = ?')
        .get(receiptId) as { id: string; status: DocumentStatus; warehouse_id: string } | undefined;

      if (!receipt) {
        throw new NotFoundError('Receipt not found');
      }

      if (receipt.status === 'done') {
        throw new ConflictError('Receipt has already been validated');
      }

      if (receipt.status === 'canceled') {
        throw new ConflictError('Canceled receipt cannot be validated');
      }

      const lines = db
        .prepare('SELECT id, product_id, location_id, expected_qty, received_qty FROM receipt_lines WHERE receipt_id = ?')
        .all(receiptId) as Array<{
          id: string;
          product_id: string;
          location_id: string;
          expected_qty: number;
          received_qty: number;
        }>;

      if (lines.length === 0) {
        throw new ValidationError('Receipt must contain at least one line item', 'lines');
      }

      const insertLedger = db.prepare(`
        INSERT INTO stock_ledgers (id, product_id, location_id, delta, doc_type, doc_id, created_by, created_at)
        VALUES (?, ?, ?, ?, 'receipt', ?, ?, datetime('now'))
      `);

      for (const line of lines) {
        if (line.received_qty < 0) {
          throw new ValidationError('Received quantity cannot be negative', 'received_qty');
        }

        // Only append positive movements
        if (line.received_qty > 0) {
          const ledgerId = crypto.randomUUID();
          insertLedger.run(ledgerId, line.product_id, line.location_id, line.received_qty, receiptId, userId);
          StockService.refreshCachedStockLevel(line.product_id, line.location_id);
        }
      }

      db.prepare("UPDATE receipts SET status = 'done', validated_at = datetime('now') WHERE id = ?").run(receiptId);

      return db.prepare('SELECT * FROM receipts WHERE id = ?').get(receiptId);
    });

    return runValidation();
  }

  /**
   * VALIDATE DELIVERY ORDER:
   * Atomic transaction:
   * - Check delivery status
   * - Row lock & check invariant: picked_qty <= available stock at location
   * - If invariant holds: append ledger row with -picked_qty
   * - Recompute cached StockLevel from SUM(ledger.delta)
   * - Update delivery status to 'done', set validated_at
   */
  public static validateDelivery(deliveryId: string, userId: string) {
    const db = getDb();

    const runValidation = db.transaction(() => {
      const delivery = db
        .prepare('SELECT id, status, warehouse_id FROM delivery_orders WHERE id = ?')
        .get(deliveryId) as { id: string; status: DocumentStatus; warehouse_id: string } | undefined;

      if (!delivery) {
        throw new NotFoundError('Delivery order not found');
      }

      if (delivery.status === 'done') {
        throw new ConflictError('Delivery order has already been validated');
      }

      if (delivery.status === 'canceled') {
        throw new ConflictError('Canceled delivery order cannot be validated');
      }

      const lines = db
        .prepare('SELECT id, product_id, location_id, expected_qty, picked_qty FROM delivery_lines WHERE delivery_id = ?')
        .all(deliveryId) as Array<{
          id: string;
          product_id: string;
          location_id: string;
          expected_qty: number;
          picked_qty: number;
        }>;

      if (lines.length === 0) {
        throw new ValidationError('Delivery order must contain at least one line item', 'lines');
      }

      // Check invariants first across all lines
      for (const line of lines) {
        if (line.picked_qty <= 0) {
          throw new ValidationError('Picked quantity must be greater than zero', 'picked_qty');
        }

        const currentStock = StockService.getLedgerStock(line.product_id, line.location_id);
        if (line.picked_qty > currentStock) {
          throw new InsufficientStockError(currentStock, 'picked_qty');
        }
      }

      const insertLedger = db.prepare(`
        INSERT INTO stock_ledgers (id, product_id, location_id, delta, doc_type, doc_id, created_by, created_at)
        VALUES (?, ?, ?, ?, 'delivery', ?, ?, datetime('now'))
      `);

      for (const line of lines) {
        const ledgerId = crypto.randomUUID();
        // Negative delta for delivery
        insertLedger.run(ledgerId, line.product_id, line.location_id, -line.picked_qty, deliveryId, userId);
        StockService.refreshCachedStockLevel(line.product_id, line.location_id);
      }

      db.prepare("UPDATE delivery_orders SET status = 'done', validated_at = datetime('now') WHERE id = ?").run(deliveryId);

      return db.prepare('SELECT * FROM delivery_orders WHERE id = ?').get(deliveryId);
    });

    return runValidation();
  }

  /**
   * VALIDATE INTERNAL TRANSFER:
   * Atomic transaction:
   * - Invariant: from_location_id !== to_location_id
   * - Invariant: qty <= available stock at from_location_id
   * - Append ledger row -qty at from_location
   * - Append ledger row +qty at to_location
   * - Recompute cached StockLevel for both locations from SUM(ledger.delta)
   * - Update transfer status to 'done', set validated_at
   */
  public static validateTransfer(transferId: string, userId: string) {
    const db = getDb();

    const runValidation = db.transaction(() => {
      const transfer = db
        .prepare('SELECT id, status, product_id, qty, from_location_id, to_location_id FROM transfers WHERE id = ?')
        .get(transferId) as {
          id: string;
          status: DocumentStatus;
          product_id: string;
          qty: number;
          from_location_id: string;
          to_location_id: string;
        } | undefined;

      if (!transfer) {
        throw new NotFoundError('Transfer not found');
      }

      if (transfer.status === 'done') {
        throw new ConflictError('Transfer has already been validated');
      }

      if (transfer.status === 'canceled') {
        throw new ConflictError('Canceled transfer cannot be validated');
      }

      if (transfer.from_location_id === transfer.to_location_id) {
        throw new ValidationError('Source and destination locations cannot be the same', 'to_location_id');
      }

      if (transfer.qty <= 0) {
        throw new ValidationError('Transfer quantity must be greater than zero', 'qty');
      }

      const availableAtSource = StockService.getLedgerStock(transfer.product_id, transfer.from_location_id);
      if (transfer.qty > availableAtSource) {
        throw new InsufficientStockError(availableAtSource, 'qty');
      }

      const insertLedger = db.prepare(`
        INSERT INTO stock_ledgers (id, product_id, location_id, delta, doc_type, doc_id, created_by, created_at)
        VALUES (?, ?, ?, ?, 'transfer', ?, ?, datetime('now'))
      `);

      // Outflow from source
      insertLedger.run(crypto.randomUUID(), transfer.product_id, transfer.from_location_id, -transfer.qty, transferId, userId);
      StockService.refreshCachedStockLevel(transfer.product_id, transfer.from_location_id);

      // Inflow to destination
      insertLedger.run(crypto.randomUUID(), transfer.product_id, transfer.to_location_id, transfer.qty, transferId, userId);
      StockService.refreshCachedStockLevel(transfer.product_id, transfer.to_location_id);

      db.prepare("UPDATE transfers SET status = 'done', validated_at = datetime('now') WHERE id = ?").run(transferId);

      return db.prepare('SELECT * FROM transfers WHERE id = ?').get(transferId);
    });

    return runValidation();
  }

  /**
   * RECORD STOCK ADJUSTMENT:
   * Atomic transaction:
   * - Counted qty >= 0
   * - Reason is non-empty
   * - Delta = counted_qty - current_stock
   * - Append ledger row with delta
   * - Recompute cached StockLevel from SUM(ledger.delta)
   * - Insert into adjustments table
   */
  public static createAdjustment(params: {
    productId: string;
    locationId: string;
    countedQty: number;
    reason: string;
    userId: string;
  }) {
    const { productId, locationId, countedQty, reason, userId } = params;

    if (countedQty < 0) {
      throw new ValidationError('Counted quantity cannot be negative', 'counted_qty');
    }

    if (!reason || reason.trim().length === 0) {
      throw new ValidationError('Adjustment reason is mandatory', 'reason');
    }

    const db = getDb();

    const runAdjustment = db.transaction(() => {
      // Verify product and location exist
      const product = db.prepare('SELECT id FROM products WHERE id = ?').get(productId);
      if (!product) throw new NotFoundError('Product not found', 'product_id');

      const location = db.prepare('SELECT id FROM locations WHERE id = ?').get(locationId);
      if (!location) throw new NotFoundError('Location not found', 'location_id');

      const currentStock = StockService.getLedgerStock(productId, locationId);
      const delta = countedQty - currentStock;

      const adjustmentId = crypto.randomUUID();

      // Insert adjustment record
      db.prepare(`
        INSERT INTO adjustments (id, product_id, location_id, counted_qty, delta, reason, created_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(adjustmentId, productId, locationId, countedQty, delta, reason.trim(), userId);

      // Append to ledger if delta != 0
      if (delta !== 0) {
        db.prepare(`
          INSERT INTO stock_ledgers (id, product_id, location_id, delta, doc_type, doc_id, created_by, created_at)
          VALUES (?, ?, ?, ?, 'adjustment', ?, ?, datetime('now'))
        `).run(crypto.randomUUID(), productId, locationId, delta, adjustmentId, userId);

        StockService.refreshCachedStockLevel(productId, locationId);
      }

      return db.prepare('SELECT * FROM adjustments WHERE id = ?').get(adjustmentId);
    });

    return runAdjustment();
  }
}
