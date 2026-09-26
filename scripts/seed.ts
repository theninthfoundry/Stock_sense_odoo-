import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { getDb } from '../src/db/database';
import { StockService } from '../src/services/stockService';

export async function runSeed(clean: boolean = true) {
  console.log('--- Running StockSense Seed & Spec Invariant Assertion ---');
  const db = getDb();

  if (clean) {
    db.prepare('DELETE FROM idempotency_logs').run();
    db.prepare('DELETE FROM otp_requests').run();
    db.prepare('DELETE FROM stock_ledgers').run();
    db.prepare('DELETE FROM stock_levels').run();
    db.prepare('DELETE FROM adjustments').run();
    db.prepare('DELETE FROM transfers').run();
    db.prepare('DELETE FROM delivery_lines').run();
    db.prepare('DELETE FROM delivery_orders').run();
    db.prepare('DELETE FROM receipt_lines').run();
    db.prepare('DELETE FROM receipts').run();
    db.prepare('DELETE FROM products').run();
    db.prepare('DELETE FROM categories').run();
    db.prepare('DELETE FROM locations').run();
    db.prepare('DELETE FROM warehouses').run();
    db.prepare('DELETE FROM users').run();
  }

  // 1. Seed Warehouses
  const whMainId = 'wh_main_001';
  db.prepare(`
    INSERT INTO warehouses (id, name, code, address, created_at)
    VALUES (?, 'Central Warehouse', 'WH-CENTRAL', '100 Industrial Parkway, Sector 4', datetime('now'))
  `).run(whMainId);

  const whEastId = 'wh_east_002';
  db.prepare(`
    INSERT INTO warehouses (id, name, code, address, created_at)
    VALUES (?, 'East Distribution Hub', 'WH-EAST', '45 Logistics Blvd, Bay 12', datetime('now'))
  `).run(whEastId);

  // 2. Seed Locations
  const locAId = 'loc_a_001';
  db.prepare(`
    INSERT INTO locations (id, warehouse_id, name, code, created_at)
    VALUES (?, ?, 'Bulk Storage Zone A', 'LOC-A', datetime('now'))
  `).run(locAId, whMainId);

  const locBId = 'loc_b_002';
  db.prepare(`
    INSERT INTO locations (id, warehouse_id, name, code, created_at)
    VALUES (?, ?, 'Picking Shelf B', 'LOC-B', datetime('now'))
  `).run(locBId, whMainId);

  const locCId = 'loc_c_003';
  db.prepare(`
    INSERT INTO locations (id, warehouse_id, name, code, created_at)
    VALUES (?, ?, 'Receiving Dock C', 'LOC-C', datetime('now'))
  `).run(locCId, whEastId);

  // 3. Seed Users
  const passwordHash = await bcrypt.hash('admin123', 10);
  const managerId = 'usr_manager_001';
  db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, warehouse_id, created_at)
    VALUES (?, 'Alex Mercer (Manager)', 'manager@stocksense.com', ?, 'inventory_manager', NULL, datetime('now'))
  `).run(managerId, passwordHash);

  const staffPasswordHash = await bcrypt.hash('staff123', 10);
  const staffId = 'usr_staff_001';
  db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, warehouse_id, created_at)
    VALUES (?, 'Sam Rivera (Staff)', 'staff@stocksense.com', ?, 'warehouse_staff', ?, datetime('now'))
  `).run(staffId, staffPasswordHash, whMainId);

  // 4. Seed Categories
  const catElectronicsId = 'cat_elec_001';
  db.prepare(`INSERT INTO categories (id, name, created_at) VALUES (?, 'Electronics', datetime('now'))`).run(catElectronicsId);
  const catHardwareId = 'cat_hard_002';
  db.prepare(`INSERT INTO categories (id, name, created_at) VALUES (?, 'Hardware & Fasteners', datetime('now'))`).run(catHardwareId);

  // 5. Seed Products
  const prod1Id = 'prod_sensor_001';
  db.prepare(`
    INSERT INTO products (id, sku, name, category_id, uom, reorder_min, reorder_max, created_at)
    VALUES (?, 'IND-SENS-01', 'Industrial Precision Sensor Pro', ?, 'Units', 15, 150, datetime('now'))
  `).run(prod1Id, catElectronicsId);

  const prod2Id = 'prod_bracket_002';
  db.prepare(`
    INSERT INTO products (id, sku, name, category_id, uom, reorder_min, reorder_max, created_at)
    VALUES (?, 'MNT-BRKT-09', 'Heavy Duty Mounting Bracket', ?, 'Pieces', 20, 200, datetime('now'))
  `).run(prod2Id, catHardwareId);

  console.log('✓ Initial master data seeded (Warehouses, Locations, Users, Categories, Products)');

  // =========================================================================
  // WORKED EXAMPLE PLAYBOOK:
  // receive +100 → transfer (net-zero) → deliver −20 → adjust −3 → assert final = 77
  // =========================================================================
  console.log('\n--- Executing Spec Worked Example ---');

  // STEP 1: RECEIVE +100 into Location A
  const receiptId = 'rcpt_spec_001';
  db.prepare(`
    INSERT INTO receipts (id, status, warehouse_id, party, reference, created_by, created_at)
    VALUES (?, 'ready', ?, 'Apex Industrial Supplies Ltd', 'PO-98201', ?, datetime('now'))
  `).run(receiptId, whMainId, managerId);

  db.prepare(`
    INSERT INTO receipt_lines (id, receipt_id, product_id, location_id, expected_qty, received_qty)
    VALUES (?, ?, ?, ?, 100, 100)
  `).run(crypto.randomUUID(), receiptId, prod1Id, locAId);

  StockService.validateReceipt(receiptId, managerId);
  const stockAfterReceipt = StockService.getLedgerStock(prod1Id, locAId);
  console.log(`Step 1 (Receive +100): Validated! Stock at Location A = ${stockAfterReceipt}`);
  if (stockAfterReceipt !== 100) throw new Error(`Step 1 assertion failed: expected 100, got ${stockAfterReceipt}`);

  // STEP 2: TRANSFER 40 from Location A to Location B (Net change = 0)
  const transferId = 'trsf_spec_001';
  db.prepare(`
    INSERT INTO transfers (id, status, product_id, qty, from_location_id, to_location_id, created_by, created_at)
    VALUES (?, 'ready', ?, 40, ?, ?, ?, datetime('now'))
  `).run(transferId, prod1Id, locAId, locBId, managerId);

  StockService.validateTransfer(transferId, managerId);
  const stockLocAAfterTransfer = StockService.getLedgerStock(prod1Id, locAId);
  const stockLocBAfterTransfer = StockService.getLedgerStock(prod1Id, locBId);
  console.log(`Step 2 (Transfer 40): Validated! Location A = ${stockLocAAfterTransfer}, Location B = ${stockLocBAfterTransfer}, Total = ${stockLocAAfterTransfer + stockLocBAfterTransfer}`);
  if (stockLocAAfterTransfer !== 60 || stockLocBAfterTransfer !== 40) {
    throw new Error(`Step 2 assertion failed: expected Loc A=60, Loc B=40, got Loc A=${stockLocAAfterTransfer}, Loc B=${stockLocBAfterTransfer}`);
  }

  // STEP 3: DELIVER -20 from Location A
  const deliveryId = 'deliv_spec_001';
  db.prepare(`
    INSERT INTO delivery_orders (id, status, warehouse_id, party, reference, created_by, created_at)
    VALUES (?, 'ready', ?, 'OmniTech Solutions Inc', 'SO-44012', ?, datetime('now'))
  `).run(deliveryId, whMainId, managerId);

  db.prepare(`
    INSERT INTO delivery_lines (id, delivery_id, product_id, location_id, expected_qty, picked_qty)
    VALUES (?, ?, ?, ?, 20, 20)
  `).run(crypto.randomUUID(), deliveryId, prod1Id, locAId);

  StockService.validateDelivery(deliveryId, managerId);
  const stockLocAAfterDelivery = StockService.getLedgerStock(prod1Id, locAId);
  console.log(`Step 3 (Deliver -20): Validated! Location A = ${stockLocAAfterDelivery}, Total = ${stockLocAAfterDelivery + stockLocBAfterTransfer}`);
  if (stockLocAAfterDelivery !== 40) {
    throw new Error(`Step 3 assertion failed: expected Loc A=40, got ${stockLocAAfterDelivery}`);
  }

  // STEP 4: ADJUST -3 at Location B (physical count found 37 instead of 40)
  StockService.createAdjustment({
    productId: prod1Id,
    locationId: locBId,
    countedQty: 37,
    reason: 'Damage discovered during pallet breakdown and calibration loss (-3 units)',
    userId: managerId
  });

  const stockLocBAfterAdjustment = StockService.getLedgerStock(prod1Id, locBId);
  console.log(`Step 4 (Adjust -3): Counted 37! Location B = ${stockLocBAfterAdjustment}`);
  if (stockLocBAfterAdjustment !== 37) {
    throw new Error(`Step 4 assertion failed: expected Loc B=37, got ${stockLocBAfterAdjustment}`);
  }

  // =========================================================================
  // FINAL INVARIANT ASSERTIONS:
  // =========================================================================
  console.log('\n--- Final Invariant Assertions ---');

  // 1. Check cached StockLevel table
  const cachedStock = db.prepare(`
    SELECT
      l.code as loc_code, sl.qty
    FROM stock_levels sl
    JOIN locations l ON sl.location_id = l.id
    WHERE sl.product_id = ?
    ORDER BY l.code
  `).all(prod1Id) as Array<{ loc_code: string; qty: number }>;

  console.log('Cached Stock Levels:', cachedStock);

  const totalCached = cachedStock.reduce((acc, row) => acc + row.qty, 0);

  // 2. Check pure SUM(ledger.delta)
  const ledgerSum = db.prepare(`
    SELECT COALESCE(SUM(delta), 0) as total_delta
    FROM stock_ledgers
    WHERE product_id = ?
  `).get(prod1Id) as { total_delta: number };

  console.log(`Pure Ledger Sum = ${ledgerSum.total_delta}`);
  console.log(`Cached Table Sum = ${totalCached}`);

  if (ledgerSum.total_delta !== 77) {
    throw new Error(`Ledger sum assertion FAILED: Expected 77, got ${ledgerSum.total_delta}`);
  }

  if (totalCached !== 77) {
    throw new Error(`Cached stock levels assertion FAILED: Expected 77, got ${totalCached}`);
  }

  // 3. Check document statuses are all 'done'
  const rStatus = (db.prepare('SELECT status FROM receipts WHERE id = ?').get(receiptId) as any).status;
  const tStatus = (db.prepare('SELECT status FROM transfers WHERE id = ?').get(transferId) as any).status;
  const dStatus = (db.prepare('SELECT status FROM delivery_orders WHERE id = ?').get(deliveryId) as any).status;

  if (rStatus !== 'done' || tStatus !== 'done' || dStatus !== 'done') {
    throw new Error(`Document status assertion FAILED: receipt=${rStatus}, transfer=${tStatus}, delivery=${dStatus}`);
  }

  console.log('✓ All 4 documents have status: done');
  console.log('=================================================================');
  console.log(' SUCCESS: StockSense Invariant Proof Validated! Final Stock = 77 ');
  console.log('=================================================================\n');

  return {
    productId: prod1Id,
    finalStock: 77,
    locAStock: 40,
    locBStock: 37,
    documentsStatus: 'done'
  };
}

if (require.main === module) {
  runSeed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed assertion failed:', err);
      process.exit(1);
    });
}
