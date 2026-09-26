import React, { useState, useEffect } from 'react';
import {
  Package,
  Search,
  Plus,
  AlertTriangle,
  Edit2,
  MapPin,
  X,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';
import { Product, Category, ProductStockLocation } from '../types';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const ProductsPage: React.FC = () => {
  const { isManager } = useAuth();
  const toast = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Stock drawer modal
  const [stockDetailProduct, setStockDetailProduct] = useState<Product | null>(null);
  const [stockLocations, setStockLocations] = useState<ProductStockLocation[]>([]);
  const [isLoadingStock, setIsLoadingStock] = useState(false);

  // Create / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    category_id: '',
    uom: 'Units',
    reorder_min: 0,
    reorder_max: 0
  });
  const [formError, setFormError] = useState<{ field?: string; message?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        api.products.list({
          search: searchTerm,
          category_id: selectedCategory,
          low_stock: lowStockFilter
        }),
        api.categories.list()
      ]);
      setProducts(prodRes.data || []);
      setCategories(catRes.data || []);
    } catch (err: any) {
      toast.error('Failed to load products: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadProducts();
    }, 200);
    return () => clearTimeout(timer);
  }, [searchTerm, selectedCategory, lowStockFilter]);

  const openStockModal = async (product: Product) => {
    setStockDetailProduct(product);
    setIsLoadingStock(true);
    try {
      const res = await api.products.getStock(product.id);
      setStockLocations(res.locations || []);
    } catch (err: any) {
      toast.error('Failed to fetch stock locations: ' + err.message);
    } finally {
      setIsLoadingStock(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingProduct(null);
    setFormData({
      sku: '',
      name: '',
      category_id: categories[0]?.id || '',
      uom: 'Units',
      reorder_min: 10,
      reorder_max: 100
    });
    setFormError({});
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (p: Product) => {
    setEditingProduct(p);
    setFormData({
      sku: p.sku,
      name: p.name,
      category_id: p.category_id,
      uom: p.uom,
      reorder_min: p.reorder_min,
      reorder_max: p.reorder_max
    });
    setFormError({});
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError({});
    setIsSubmitting(true);

    try {
      if (editingProduct) {
        await api.products.update(editingProduct.id, {
          sku: formData.sku,
          name: formData.name,
          category_id: formData.category_id,
          uom: formData.uom,
          reorder_min: Number(formData.reorder_min),
          reorder_max: Number(formData.reorder_max)
        });
        toast.success(`Product ${formData.sku} updated successfully`);
      } else {
        await api.products.create({
          sku: formData.sku,
          name: formData.name,
          category_id: formData.category_id,
          uom: formData.uom,
          reorder_min: Number(formData.reorder_min),
          reorder_max: Number(formData.reorder_max)
        });
        toast.success(`Product ${formData.sku} created successfully`);
      }

      setIsModalOpen(false);
      loadProducts();
    } catch (err: any) {
      setFormError({ field: err.field, message: err.message });
      toast.error(err.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Product Catalog & Stock Levels
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-xs)', marginTop: 4 }}>
            Monitor real-time on-hand quantities across warehouse locations with automatic reorder alerts
          </p>
        </div>

        {isManager && (
          <button onClick={handleOpenCreateModal} className="btn btn-primary">
            <Plus size={16} />
            <span>Create Product</span>
          </button>
        )}
      </div>

      {/* Primary Search & Filter Bar */}
      <div className="card" style={{ padding: 'var(--space-2) var(--space-3)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', alignItems: 'center' }}>
          {/* Primary Search Control per spec */}
          <div style={{ position: 'relative', flex: '1 1 300px' }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: 11 }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: 38 }}
              placeholder="Search by SKU or Product Name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Category Filter */}
          <select
            className="form-select"
            style={{ width: 'auto', minWidth: 160 }}
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Low Stock Toggle */}
          <button
            type="button"
            className={`filter-chip ${lowStockFilter ? 'active' : ''}`}
            onClick={() => setLowStockFilter(!lowStockFilter)}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <AlertTriangle size={14} />
            <span>Low Stock Alert Only</span>
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Product Name</th>
              <th>Category</th>
              <th>UOM</th>
              <th>Reorder (Min / Max)</th>
              <th>Total Stock On Hand</th>
              <th>Status Flag</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: 'var(--space-5)', color: 'var(--text-muted)' }}>
                  No products found matching your search.
                </td>
              </tr>
            ) : (
              products.map((p) => (
                <tr key={p.id} className={p.is_low_stock ? 'low-stock-row' : ''}>
                  <td>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#ffffff' }}>
                      {p.sku}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td>
                    <span style={{
                      fontSize: 'var(--text-xs)',
                      padding: '2px 8px',
                      borderRadius: 4,
                      backgroundColor: 'var(--bg-surface-elevated)',
                      color: 'var(--text-secondary)'
                    }}>
                      {p.category_name || 'General'}
                    </span>
                  </td>
                  <td>{p.uom}</td>
                  <td>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                      Min: <strong>{p.reorder_min}</strong> / Max: <strong>{p.reorder_max || '—'}</strong>
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => openStockModal(p)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        color: 'var(--text-primary)',
                        fontWeight: 700,
                        fontSize: 'var(--text-base)'
                      }}
                      title="Click to view locations breakdown"
                    >
                      <MapPin size={14} color="#ffffff" />
                      <span>{p.total_stock} {p.uom}</span>
                    </button>
                  </td>
                  <td>
                    {p.is_out_of_stock ? (
                      <span className="stock-badge-out">
                        <AlertTriangle size={12} />
                        OUT OF STOCK
                      </span>
                    ) : p.is_low_stock ? (
                      <span className="stock-badge-low">
                        <AlertTriangle size={12} />
                        LOW STOCK
                      </span>
                    ) : (
                      <span style={{ fontSize: 'var(--text-xs)', color: '#ffffff', fontWeight: 600 }}>
                        ✓ Healthy
                      </span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => openStockModal(p)}
                        className="btn btn-secondary"
                        style={{ padding: '4px 8px', fontSize: 'var(--text-xs)' }}
                        title="Stock by Location"
                      >
                        <MapPin size={12} />
                        <span>Locations</span>
                      </button>
                      {isManager && (
                        <button
                          onClick={() => handleOpenEditModal(p)}
                          className="btn btn-secondary"
                          style={{ padding: '4px 8px', fontSize: 'var(--text-xs)' }}
                          title="Edit Rules"
                        >
                          <Edit2 size={12} />
                          <span>Edit</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Stock by Location Drawer/Modal */}
      {stockDetailProduct && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 540 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <MapPin size={20} color="#ffffff" />
                <div>
                  <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700 }}>
                    {stockDetailProduct.name}
                  </h3>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    SKU: {stockDetailProduct.sku}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setStockDetailProduct(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              {isLoadingStock ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-3)' }}>
                  <RefreshCw className="animate-spin" size={24} />
                </div>
              ) : stockLocations.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-3)' }}>
                  No stock currently stored in any warehouse location.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {stockLocations.map((loc) => (
                    <div
                      key={loc.location_id}
                      style={{
                        padding: '12px 16px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--bg-canvas)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600 }}>{loc.location_name}</div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                          {loc.warehouse_name} • Code: <span style={{ fontFamily: 'var(--font-mono)' }}>{loc.location_code}</span>
                        </div>
                      </div>
                      <div style={{ fontSize: 'var(--text-base)', fontWeight: 800, color: loc.qty > 0 ? '#ffffff' : 'var(--text-muted)' }}>
                        {loc.qty} {stockDetailProduct.uom}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setStockDetailProduct(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT PRODUCT MODAL */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 520 }}>
            <form onSubmit={handleSubmit}>
              <div className="modal-header">
                <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700 }}>
                  {editingProduct ? 'Edit Catalog Product' : 'Create New Catalog Product'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Product SKU (Unique)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. IND-SENS-01"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    required
                  />
                  {formError.field === 'sku' && (
                    <span className="form-error-inline">{formError.message}</span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Product Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Industrial Sensor Pro"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: varSpace }}>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select
                      className="form-select"
                      value={formData.category_id}
                      onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                      required
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Unit of Measure (UOM)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Units, Pieces, Kg, Meters"
                      value={formData.uom}
                      onChange={(e) => setFormData({ ...formData, uom: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: varSpace }}>
                  <div className="form-group">
                    <label className="form-label">Reorder Min (Alert Threshold)</label>
                    <input
                      type="number"
                      min={0}
                      className="form-input"
                      value={formData.reorder_min}
                      onChange={(e) => setFormData({ ...formData, reorder_min: Number(e.target.value) })}
                      required
                    />
                    {formError.field === 'reorder_min' && (
                      <span className="form-error-inline">{formError.message}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Reorder Max (Capacity)</label>
                    <input
                      type="number"
                      min={0}
                      className="form-input"
                      value={formData.reorder_max}
                      onChange={(e) => setFormData({ ...formData, reorder_max: Number(e.target.value) })}
                    />
                    {formError.field === 'reorder_max' && (
                      <span className="form-error-inline">{formError.message}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : editingProduct ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const varSpace = 'var(--space-2)';
