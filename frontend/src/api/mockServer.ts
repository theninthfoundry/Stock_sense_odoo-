import {
  DashboardKpis,
  Product,
  Receipt,
  DeliveryOrder,
  Transfer,
  Adjustment,
  Warehouse,
  Location,
  Category
} from '../types';

export const mockWarehouses: Warehouse[] = [
  { id: 'wh_main_001', name: 'Central Warehouse', code: 'WH-CENTRAL', address: '100 Industrial Parkway, Sector 4', created_at: '2026-01-01 10:00:00', locations_count: 2, total_stock: 77 },
  { id: 'wh_east_002', name: 'East Distribution Hub', code: 'WH-EAST', address: '45 Logistics Blvd, Bay 12', created_at: '2026-01-01 10:00:00', locations_count: 1, total_stock: 0 }
];

export const mockLocations: Location[] = [
  { id: 'loc_a_001', warehouse_id: 'wh_main_001', warehouse_name: 'Central Warehouse', warehouse_code: 'WH-CENTRAL', name: 'Bulk Storage Zone A', code: 'LOC-A', created_at: '2026-01-01 10:00:00', total_stock: 40 },
  { id: 'loc_b_002', warehouse_id: 'wh_main_001', warehouse_name: 'Central Warehouse', warehouse_code: 'WH-CENTRAL', name: 'Picking Shelf B', code: 'LOC-B', created_at: '2026-01-01 10:00:00', total_stock: 37 },
  { id: 'loc_c_003', warehouse_id: 'wh_east_002', warehouse_name: 'East Distribution Hub', warehouse_code: 'WH-EAST', name: 'Receiving Dock C', code: 'LOC-C', created_at: '2026-01-01 10:00:00', total_stock: 0 }
];

export const mockCategories: Category[] = [
  { id: 'cat_elec_001', name: 'Electronics', created_at: '2026-01-01 10:00:00', products_count: 1 },
  { id: 'cat_hard_002', name: 'Hardware & Fasteners', created_at: '2026-01-01 10:00:00', products_count: 1 }
];

export const mockProducts: Product[] = [
  {
    id: 'prod_sensor_001',
    sku: 'IND-SENS-01',
    name: 'Industrial Precision Sensor Pro',
    category_id: 'cat_elec_001',
    category_name: 'Electronics',
    uom: 'Units',
    reorder_min: 15,
    reorder_max: 150,
    created_at: '2026-01-01 10:00:00',
    total_stock: 77,
    is_low_stock: false,
    is_out_of_stock: false
  },
  {
    id: 'prod_bracket_002',
    sku: 'MNT-BRKT-09',
    name: 'Heavy Duty Mounting Bracket',
    category_id: 'cat_hard_002',
    category_name: 'Hardware & Fasteners',
    uom: 'Pieces',
    reorder_min: 20,
    reorder_max: 200,
    created_at: '2026-01-01 10:00:00',
    total_stock: 25,
    is_low_stock: false,
    is_out_of_stock: false
  }
];

export const mockKpis: DashboardKpis = {
  total_stock_qty: 102,
  total_products: 2,
  low_stock_count: 0,
  out_of_stock_count: 0,
  pending_receipts: 0,
  pending_deliveries: 0,
  pending_transfers: 0,
  total_pending_ops: 0
};
