export type UserRole = 'inventory_manager' | 'warehouse_staff';

export type DocumentStatus = 'draft' | 'waiting' | 'ready' | 'done' | 'canceled';

export type DocumentType = 'receipt' | 'delivery' | 'transfer' | 'adjustment';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  warehouse_id?: string | null;
  created_at: string;
}

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  address?: string | null;
  created_at: string;
  locations_count?: number;
  total_stock?: number;
}

export interface Location {
  id: string;
  warehouse_id: string;
  warehouse_name?: string;
  warehouse_code?: string;
  name: string;
  code: string;
  created_at: string;
  total_stock?: number;
}

export interface Category {
  id: string;
  name: string;
  created_at: string;
  products_count?: number;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category_id: string;
  category_name?: string;
  uom: string;
  reorder_min: number;
  reorder_max: number;
  created_at: string;
  total_stock: number;
  is_low_stock: boolean;
  is_out_of_stock: boolean;
}

export interface ProductStockLocation {
  location_id: string;
  location_name: string;
  location_code: string;
  warehouse_id: string;
  warehouse_name: string;
  qty: number;
  updated_at: string;
}

export interface Receipt {
  id: string;
  status: DocumentStatus;
  warehouse_id: string;
  warehouse_name?: string;
  party: string;
  reference?: string | null;
  created_by: string;
  created_by_name?: string;
  validated_at?: string | null;
  created_at: string;
  total_lines?: number;
  total_received_qty?: number;
  lines?: ReceiptLine[];
}

export interface ReceiptLine {
  id?: string;
  receipt_id?: string;
  product_id: string;
  product_name?: string;
  product_sku?: string;
  uom?: string;
  location_id: string;
  location_name?: string;
  location_code?: string;
  expected_qty: number;
  received_qty: number;
}

export interface DeliveryOrder {
  id: string;
  status: DocumentStatus;
  warehouse_id: string;
  warehouse_name?: string;
  party: string;
  reference?: string | null;
  created_by: string;
  created_by_name?: string;
  validated_at?: string | null;
  created_at: string;
  total_lines?: number;
  total_picked_qty?: number;
  lines?: DeliveryLine[];
}

export interface DeliveryLine {
  id?: string;
  delivery_id?: string;
  product_id: string;
  product_name?: string;
  product_sku?: string;
  uom?: string;
  location_id: string;
  location_name?: string;
  location_code?: string;
  expected_qty: number;
  picked_qty: number;
  current_available_stock?: number;
}

export interface Transfer {
  id: string;
  status: DocumentStatus;
  product_id: string;
  product_name?: string;
  product_sku?: string;
  uom?: string;
  qty: number;
  from_location_id: string;
  from_location_name?: string;
  from_location_code?: string;
  from_warehouse_name?: string;
  to_location_id: string;
  to_location_name?: string;
  to_location_code?: string;
  to_warehouse_name?: string;
  created_by: string;
  created_by_name?: string;
  validated_at?: string | null;
  created_at: string;
  current_available_at_source?: number;
}

export interface Adjustment {
  id: string;
  product_id: string;
  product_name?: string;
  product_sku?: string;
  uom?: string;
  location_id: string;
  location_name?: string;
  location_code?: string;
  warehouse_name?: string;
  counted_qty: number;
  delta: number;
  reason: string;
  created_by: string;
  created_by_name?: string;
  created_at: string;
}

export interface DashboardKpis {
  total_stock_qty: number;
  total_products: number;
  low_stock_count: number;
  out_of_stock_count: number;
  pending_receipts: number;
  pending_deliveries: number;
  pending_transfers: number;
  total_pending_ops: number;
}

export interface ApiError {
  code: string;
  message: string;
  field?: string;
}

export interface ApiListResponse<T> {
  data: T[];
  next_cursor: string | null;
}
