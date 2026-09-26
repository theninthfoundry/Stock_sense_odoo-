export type UserRole = 'inventory_manager' | 'warehouse_staff';

export type DocumentStatus = 'draft' | 'waiting' | 'ready' | 'done' | 'canceled';

export type DocumentType = 'receipt' | 'delivery' | 'transfer' | 'adjustment';

export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
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
}

export interface Location {
  id: string;
  warehouse_id: string;
  name: string;
  code: string;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  created_at: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category_id: string;
  uom: string;
  reorder_min: number;
  reorder_max: number;
  created_at: string;
}

export interface StockLevel {
  product_id: string;
  location_id: string;
  qty: number;
  updated_at: string;
}

export interface StockLedger {
  id: string;
  product_id: string;
  location_id: string;
  delta: number;
  doc_type: DocumentType;
  doc_id: string;
  created_by: string;
  created_at: string;
}

export interface Receipt {
  id: string;
  status: DocumentStatus;
  warehouse_id: string;
  party: string;
  reference?: string | null;
  created_by: string;
  validated_at?: string | null;
  created_at: string;
  lines?: ReceiptLine[];
}

export interface ReceiptLine {
  id: string;
  receipt_id: string;
  product_id: string;
  location_id: string;
  expected_qty: number;
  received_qty: number;
}

export interface DeliveryOrder {
  id: string;
  status: DocumentStatus;
  warehouse_id: string;
  party: string;
  reference?: string | null;
  created_by: string;
  validated_at?: string | null;
  created_at: string;
  lines?: DeliveryLine[];
}

export interface DeliveryLine {
  id: string;
  delivery_id: string;
  product_id: string;
  location_id: string;
  expected_qty: number;
  picked_qty: number;
}

export interface Transfer {
  id: string;
  status: DocumentStatus;
  product_id: string;
  qty: number;
  from_location_id: string;
  to_location_id: string;
  created_by: string;
  validated_at?: string | null;
  created_at: string;
}

export interface Adjustment {
  id: string;
  product_id: string;
  location_id: string;
  counted_qty: number;
  delta: number;
  reason: string;
  created_by: string;
  created_at: string;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    field?: string;
  };
}

export interface ApiListResponse<T> {
  data: T[];
  next_cursor: string | null;
}
