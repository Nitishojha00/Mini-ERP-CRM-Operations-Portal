import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { fetchProducts, createProduct, Product } from '../api/products';
import { getErrorMessage } from '../api/client';
import { useAuth } from '../AuthContext';

const emptyForm = {
  productName: '',
  sku: '',
  category: '',
  unitPrice: '',
  currentStock: '',
  minStockAlert: '',
  location: '',
};

export default function Products() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [lowStock, setLowStock] = useState(params.get('lowStock') === 'true');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>(emptyForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const canManage = user?.role === 'Admin' || user?.role === 'Warehouse';

  async function load() {
    setLoading(true);
    const res = await fetchProducts({ search, lowStock });
    setProducts(res.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lowStock]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await createProduct({
        ...form,
        unitPrice: Number(form.unitPrice),
        currentStock: Number(form.currentStock) || 0,
        minStockAlert: Number(form.minStockAlert) || 0,
      });
      setShowForm(false);
      setForm(emptyForm);
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Products & Inventory</h1>
        {canManage && (
          <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>
            {showForm ? 'Cancel' : '+ Add Product'}
          </button>
        )}
      </div>

      {showForm && (
        <form className="card form-grid" onSubmit={handleCreate}>
          {error && <div className="alert-error span-2">{error}</div>}
          <div><label>Product name *</label><input required value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} /></div>
          <div><label>SKU/code *</label><input required value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></div>
          <div><label>Category</label><input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
          <div><label>Unit price *</label><input required type="number" step="0.01" min="0" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} /></div>
          <div><label>Opening stock</label><input type="number" min="0" value={form.currentStock} onChange={(e) => setForm({ ...form, currentStock: e.target.value })} /></div>
          <div><label>Min stock alert qty</label><input type="number" min="0" value={form.minStockAlert} onChange={(e) => setForm({ ...form, minStockAlert: e.target.value })} /></div>
          <div className="span-2"><label>Location/warehouse</label><input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
          <div className="span-2"><button className="btn-primary" type="submit">Save product</button></div>
        </form>
      )}

      <form className="toolbar" onSubmit={(e) => { e.preventDefault(); load(); }}>
        <input placeholder="Search by name or SKU..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <label className="checkbox-label">
          <input type="checkbox" checked={lowStock} onChange={(e) => setLowStock(e.target.checked)} />
          Low stock only
        </label>
        <button className="btn-secondary" type="submit">Search</button>
      </form>

      {loading ? <p>Loading...</p> : (
        <table className="data-table">
          <thead>
            <tr><th>Name</th><th>SKU</th><th>Category</th><th>Price</th><th>Stock</th><th>Location</th></tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td><Link to={`/products/${p.id}`}>{p.product_name}</Link></td>
                <td>{p.sku}</td>
                <td>{p.category || '—'}</td>
                <td>₹{Number(p.unit_price).toFixed(2)}</td>
                <td>
                  <span className={p.current_stock <= p.min_stock_alert ? 'stock-low' : ''}>
                    {p.current_stock}
                  </span>
                  {p.current_stock <= p.min_stock_alert && <span className="badge badge-lead"> Low</span>}
                </td>
                <td>{p.location || '—'}</td>
              </tr>
            ))}
            {products.length === 0 && <tr><td colSpan={6} className="empty-state">No products found.</td></tr>}
          </tbody>
        </table>
      )}
    </div>
  );
}
