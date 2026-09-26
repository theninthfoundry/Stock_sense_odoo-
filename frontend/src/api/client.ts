import {
  ApiListResponse,
  DashboardKpis,
  DeliveryOrder,
  Product,
  Receipt,
  Transfer,
  Adjustment,
  User,
  Warehouse,
  Location,
  Category,
  ProductStockLocation
} from '../types';

export const API_BASE_URL = '/api/v1';

export class ApiError extends Error {
  public code: string;
  public field?: string;
  public status: number;

  constructor(status: number, code: string, message: string, field?: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.field = field;
  }
}

export function getStoredToken(): string | null {
  return localStorage.getItem('stocksense_jwt_token');
}

export function setStoredToken(token: string | null): void {
  if (token) {
    localStorage.setItem('stocksense_jwt_token', token);
  } else {
    localStorage.removeItem('stocksense_jwt_token');
  }
}

export function getStoredUser(): User | null {
  const data = localStorage.getItem('stocksense_user');
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function setStoredUser(user: User | null): void {
  if (user) {
    localStorage.setItem('stocksense_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('stocksense_user');
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // If validating, ensure X-Idempotency-Key is sent per contract
  if (endpoint.includes('/validate') && !headers['X-Idempotency-Key']) {
    headers['X-Idempotency-Key'] = `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errObj = data.error || {};
    throw new ApiError(
      response.status,
      errObj.code || 'UNKNOWN_ERROR',
      errObj.message || response.statusText || 'An unexpected error occurred',
      errObj.field
    );
  }

  return data as T;
}

export const api = {
  // Auth
  auth: {
    signup: (body: { name: string; email: string; password: string; role?: string; warehouse_id?: string }) =>
      request<{ user: User; token: string }>('/auth/signup', {
        method: 'POST',
        body: JSON.stringify(body)
      }),
    login: (body: { email: string; password: string }) =>
      request<{ user: User; token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(body)
      }),
    requestOtp: (email: string) =>
      request<{ message: string; otpCode?: string }>('/auth/otp/request', {
        method: 'POST',
        body: JSON.stringify({ email })
      }),
    resetPassword: (body: { email: string; otp: string; newPassword: string }) =>
      request<{ message: string }>('/auth/otp/reset', {
        method: 'POST',
        body: JSON.stringify(body)
      }),
    me: () => request<{ user: User }>('/auth/me')
  },

  // Products
  products: {
    list: (params?: { search?: string; category_id?: string; low_stock?: boolean }) => {
      const q = new URLSearchParams();
      if (params?.search) q.append('search', params.search);
      if (params?.category_id) q.append('category_id', params.category_id);
      if (params?.low_stock) q.append('low_stock', 'true');
      return request<ApiListResponse<Product>>(`/products?${q.toString()}`);
    },
    getStock: (productId: string) =>
      request<{ product: Product; total_stock: number; locations: ProductStockLocation[] }>(
        `/products/${productId}/stock`
      ),
    create: (body: { sku: string; name: string; category_id: string; uom?: string; reorder_min?: number; reorder_max?: number }) =>
      request<Product>('/products', {
        method: 'POST',
        body: JSON.stringify(body)
      }),
    update: (id: string, body: Partial<Product>) =>
      request<Product>(`/products/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body)
      })
  },

  // Receipts
  receipts: {
    list: (params?: { status?: string; warehouse_id?: string }) => {
      const q = new URLSearchParams();
      if (params?.status) q.append('status', params.status);
      if (params?.warehouse_id) q.append('warehouse_id', params.warehouse_id);
      return request<ApiListResponse<Receipt>>(`/receipts?${q.toString()}`);
    },
    get: (id: string) => request<Receipt>(`/receipts/${id}`),
    create: (body: { warehouse_id: string; party: string; reference?: string; status?: string; lines: any[] }) =>
      request<Receipt>('/receipts', {
        method: 'POST',
        body: JSON.stringify(body)
      }),
    validate: (id: string, idempotencyKey?: string) =>
      request<Receipt>(`/receipts/${id}/validate`, {
        method: 'POST',
        headers: idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey } : undefined
      })
  },

  // Deliveries
  deliveries: {
    list: (params?: { status?: string; warehouse_id?: string }) => {
      const q = new URLSearchParams();
      if (params?.status) q.append('status', params.status);
      if (params?.warehouse_id) q.append('warehouse_id', params.warehouse_id);
      return request<ApiListResponse<DeliveryOrder>>(`/deliveries?${q.toString()}`);
    },
    get: (id: string) => request<DeliveryOrder>(`/deliveries/${id}`),
    create: (body: { warehouse_id: string; party: string; reference?: string; status?: string; lines: any[] }) =>
      request<DeliveryOrder>('/deliveries', {
        method: 'POST',
        body: JSON.stringify(body)
      }),
    validate: (id: string, idempotencyKey?: string) =>
      request<DeliveryOrder>(`/deliveries/${id}/validate`, {
        method: 'POST',
        headers: idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey } : undefined
      })
  },

  // Transfers
  transfers: {
    list: (params?: { status?: string; product_id?: string }) => {
      const q = new URLSearchParams();
      if (params?.status) q.append('status', params.status);
      if (params?.product_id) q.append('product_id', params.product_id);
      return request<ApiListResponse<Transfer>>(`/transfers?${q.toString()}`);
    },
    get: (id: string) => request<Transfer>(`/transfers/${id}`),
    create: (body: { product_id: string; qty: number; from_location_id: string; to_location_id: string; status?: string }) =>
      request<Transfer>('/transfers', {
        method: 'POST',
        body: JSON.stringify(body)
      }),
    validate: (id: string, idempotencyKey?: string) =>
      request<Transfer>(`/transfers/${id}/validate`, {
        method: 'POST',
        headers: idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey } : undefined
      })
  },

  // Adjustments
  adjustments: {
    list: () => request<ApiListResponse<Adjustment>>('/adjustments'),
    create: (body: { product_id: string; location_id: string; counted_qty: number; reason: string }) =>
      request<Adjustment>('/adjustments', {
        method: 'POST',
        body: JSON.stringify(body)
      })
  },

  // Dashboard
  dashboard: {
    getKpis: (params?: { type?: string; status?: string; warehouse?: string; category?: string }) => {
      const q = new URLSearchParams();
      if (params?.type) q.append('type', params.type);
      if (params?.status) q.append('status', params.status);
      if (params?.warehouse) q.append('warehouse', params.warehouse);
      if (params?.category) q.append('category', params.category);
      return request<DashboardKpis>(`/dashboard/kpis?${q.toString()}`);
    },
    getOperations: (params?: { type?: string; status?: string; warehouse?: string; category?: string }) => {
      const q = new URLSearchParams();
      if (params?.type) q.append('type', params.type);
      if (params?.status) q.append('status', params.status);
      if (params?.warehouse) q.append('warehouse', params.warehouse);
      if (params?.category) q.append('category', params.category);
      return request<ApiListResponse<any>>(`/dashboard/operations?${q.toString()}`);
    },
    getLedger: (params?: { product_id?: string; location_id?: string }) => {
      const q = new URLSearchParams();
      if (params?.product_id) q.append('product_id', params.product_id);
      if (params?.location_id) q.append('location_id', params.location_id);
      return request<ApiListResponse<any>>(`/dashboard/ledger?${q.toString()}`);
    }
  },

  // Warehouses & Locations
  warehouses: {
    list: () => request<ApiListResponse<Warehouse>>('/warehouses'),
    create: (body: { name: string; code: string; address?: string }) =>
      request<Warehouse>('/warehouses', {
        method: 'POST',
        body: JSON.stringify(body)
      }),
    update: (id: string, body: { name?: string; code?: string; address?: string }) =>
      request<Warehouse>(`/warehouses/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body)
      }),
    delete: (id: string) =>
      request<{ message: string }>(`/warehouses/${id}`, {
        method: 'DELETE'
      })
  },

  locations: {
    list: (warehouse_id?: string) => {
      const q = new URLSearchParams();
      if (warehouse_id) q.append('warehouse_id', warehouse_id);
      return request<ApiListResponse<Location>>(`/locations?${q.toString()}`);
    },
    create: (body: { warehouse_id: string; name: string; code: string }) =>
      request<Location>('/locations', {
        method: 'POST',
        body: JSON.stringify(body)
      }),
    update: (id: string, body: { name?: string; code?: string }) =>
      request<Location>(`/locations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body)
      }),
    delete: (id: string) =>
      request<{ message: string }>(`/locations/${id}`, {
        method: 'DELETE'
      })
  },

  // Categories
  categories: {
    list: () => request<ApiListResponse<Category>>('/categories'),
    create: (body: { name: string }) =>
      request<Category>('/categories', {
        method: 'POST',
        body: JSON.stringify(body)
      })
  },

  // Health
  health: () => request<{ status: string; timestamp: string }>('/health')
};
