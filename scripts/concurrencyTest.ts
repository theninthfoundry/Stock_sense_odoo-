import crypto from 'crypto';
import { getDb } from '../src/db/database';
import { StockService } from '../src/services/stockService';
import { InsufficientStockError } from '../src/utils/errors';

export async function testConcurrency() {
  console.log('\n--- Running StockSense Concurrency Test ---');
  console.log('Scenario: Two simultaneous delivery validations against a low-stock item (available: 10)');
  console.log('Requirement: Exactly one succeeds, one fails with INSUFFICIENT_STOCK, final stock = 0 (never negative)');

  const db = getDb();

  // Find or create test product
  const cat = db.prepare('SELECT id FROM categories LIMIT 1').get() as { id: string };
  const loc = db.prepare("SELECT id, warehouse_id FROM locations WHERE code = 'LOC-A' LIMIT 1").get() as { id: string; warehouse_id: string };
  const manager = db.prepare("SELECT id FROM users WHERE role = 'inventory_manager' LIMIT 1").get() as { id: string };

  const testProdId = 'prod_concurrent_test_' + Date.now();
  db.prepare(`
    INSERT INTO products (id, sku, name, category_id, uom, reorder_min, reorder_max, created_at)
    VALUES (?, ?, 'Concurrency Test Widget', ?, 'Units', 2, 20, datetime('now'))
  `).run(testProdId, 'SKU-CONC-' + Math.floor(Math.random() * 10000), cat.id);

  // 1. Initial receipt of exactly 10 units
  const initReceiptId = 'rcpt_conc_' + Date.now();
  db.prepare(`
    INSERT INTO receipts (id, status, warehouse_id, party, reference, created_by, created_at)
    VALUES (?, 'ready', ?, 'Test Supplier', 'INIT-10', ?, datetime('now'))
  `).run(initReceiptId, loc.warehouse_id, manager.id);

  db.prepare(`
    INSERT INTO receipt_lines (id, receipt_id, product_id, location_id, expected_qty, received_qty)
    VALUES (?, ?, ?, ?, 10, 10)
  `).run(crypto.randomUUID(), initReceiptId, testProdId, loc.id);

  StockService.validateReceipt(initReceiptId, manager.id);
  const initialStock = StockService.getLedgerStock(testProdId, loc.id);
  console.log(`Initial stock received: ${initialStock} units`);

  // 2. Create two delivery orders, each requesting the full 10 units
  const deliv1Id = 'deliv_conc_1_' + Date.now();
  db.prepare(`
    INSERT INTO delivery_orders (id, status, warehouse_id, party, reference, created_by, created_at)
    VALUES (?, 'ready', ?, 'Customer A', 'CONC-DELIV-1', ?, datetime('now'))
  `).run(deliv1Id, loc.warehouse_id, manager.id);
  db.prepare(`
    INSERT INTO delivery_lines (id, delivery_id, product_id, location_id, expected_qty, picked_qty)
    VALUES (?, ?, ?, ?, 10, 10)
  `).run(crypto.randomUUID(), deliv1Id, testProdId, loc.id);

  const deliv2Id = 'deliv_conc_2_' + Date.now();
  db.prepare(`
    INSERT INTO delivery_orders (id, status, warehouse_id, party, reference, created_by, created_at)
    VALUES (?, 'ready', ?, 'Customer B', 'CONC-DELIV-2', ?, datetime('now'))
  `).run(deliv2Id, loc.warehouse_id, manager.id);
  db.prepare(`
    INSERT INTO delivery_lines (id, delivery_id, product_id, location_id, expected_qty, picked_qty)
    VALUES (?, ?, ?, ?, 10, 10)
  `).run(crypto.randomUUID(), deliv2Id, testProdId, loc.id);

  // 3. Launch concurrent validations
  let successCount = 0;
  let failCount = 0;
  let failedError: any = null;

  const validate = async (id: string, label: string) => {
    try {
      StockService.validateDelivery(id, manager.id);
      successCount++;
      console.log(`[${label}] Validation succeeded!`);
    } catch (err: any) {
      failCount++;
      failedError = err;
      console.log(`[${label}] Validation rejected as expected: ${err.message}`);
    }
  };

  await Promise.all([
    validate(deliv1Id, 'Delivery 1'),
    validate(deliv2Id, 'Delivery 2')
  ]);

  console.log(`\nResults: Successes = ${successCount}, Failures = ${failCount}`);

  if (successCount !== 1 || failCount !== 1) {
    throw new Error(`Concurrency invariant violated: expected 1 success and 1 failure, got ${successCount} successes and ${failCount} failures`);
  }

  if (!(failedError instanceof InsufficientStockError) && !failedError?.message?.includes('Quantity exceeds available stock')) {
    throw new Error(`Expected InsufficientStockError, got ${failedError}`);
  }

  // 4. Verify stock level did not go negative
  const finalStock = StockService.getLedgerStock(testProdId, loc.id);
  console.log(`Final stock level: ${finalStock}`);
  if (finalStock !== 0) {
    throw new Error(`Final stock should be exactly 0, got ${finalStock}`);
  }

  console.log('=================================================================');
  console.log(' SUCCESS: Concurrency Invariant Verified (Zero Overselling)      ');
  console.log('=================================================================\n');
}

if (require.main === module) {
  testConcurrency()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Concurrency test failed:', err);
      process.exit(1);
    });
}
