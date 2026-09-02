import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchProduct, updateProduct, addStockMovement } from '../api/products';
import { getErrorMessage } from '../api/client';
import { useAuth } from '../AuthContext';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [product, setProduct] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>(null);
  const [movementForm, setMovementForm] = useState({ quantityChanged: '', movementType: 'IN', reason: '' });
  const [error, setError] = useState('');
  const canManage = user?.role === 'Admin' || user?.role === 'Warehouse';

  async function load() {
    const data = await fetchProduct(Number(id));
    setProduct(data);
    setForm({
      productName: data.product_name,
      category: data.category || '',
      unitPrice: data.unit_price,
      minStockAlert: data.min_stock_alert,
      location: data.location || '',
    });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await updateProduct(Number(id), { ...form, unitPrice: Number(form.unitPrice), minStockAlert: Number(form.minStockAlert) });
      setEditing(false);
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleMovement(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await addStockMovement(Number(id), {
        ...movementForm,
        quantityChanged: Number(movementForm.quantityChanged),
      });
      setMovementForm({ quantityChanged: '', movementType: 'IN', reason: '' });
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  if (!product || !form) return <div className="page">Loading...</div>;

  return (
    <div className="page">
      <button className="btn-link" onClick={() => navigate('/products')}>&larr; Back to products</button>
      <div className="page-header">
        <h1>{product.product_name}</h1>
        {canManage && <button className="btn-secondary" onClick={() => setEditing((e) => !e)}>{editing ? 'Cancel' : 'Edit'}</button>}
      </div>

      {error && <div className="alert-error">{error}</div>}

      {editing ? (
        <form className="card form-grid" onSubmit={handleSave}>
          <div><label>Product name *</label><input required value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} /></div>
          <div><label>SKU</label><input disabled value={product.sku} /></div>
          <div><label>Category</label><input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
          <div><label>Unit price *</label><input required type="number" step="0.01" min="0" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} /></div>
          <div><label>Min stock alert qty</label><input type="number" min="0" value={form.minStockAlert} onChange={(e) => setForm({ ...form, minStockAlert: e.target.value })} /></div>
          <div><label>Location</label><input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
          <div className="span-2"><button className="btn-primary" type="submit">Save changes</button></div>
        </form>
      ) : (
        <div className="card detail-grid">
          <div><span className="detail-label">SKU</span>{product.sku}</div>
          <div><span className="detail-label">Category</span>{product.category || '—'}</div>
          <div><span className="detail-label">Unit price</span>₹{Number(product.unit_price).toFixed(2)}</div>
          <div><span className="detail-label">Current stock</span><strong className={product.current_stock <= product.min_stock_alert ? 'stock-low' : ''}>{product.current_stock}</strong></div>
          <div><span className="detail-label">Min stock alert</span>{product.min_stock_alert}</div>
          <div><span className="detail-label">Location</span>{product.location || '—'}</div>
        </div>
      )}

      {canManage && (
        <>
          <h2>Adjust stock</h2>
          <form className="card form-grid" onSubmit={handleMovement}>
            <div>
              <label>Movement type</label>
              <select value={movementForm.movementType} onChange={(e) => setMovementForm({ ...movementForm, movementType: e.target.value })}>
                <option value="IN">IN (add stock)</option>
                <option value="OUT">OUT (remove stock)</option>
              </select>
            </div>
            <div>
              <label>Quantity *</label>
              <input required type="number" min="1" value={movementForm.quantityChanged} onChange={(e) => setMovementForm({ ...movementForm, quantityChanged: e.target.value })} />
            </div>
            <div className="span-2">
              <label>Reason</label>
              <input value={movementForm.reason} onChange={(e) => setMovementForm({ ...movementForm, reason: e.target.value })} placeholder="e.g. Purchase order received, damaged stock, correction..." />
            </div>
            <div className="span-2"><button className="btn-primary" type="submit">Record movement</button></div>
          </form>
        </>
      )}

      <h2>Stock movement log</h2>
      <table className="data-table">
        <thead><tr><th>Date</th><th>Type</th><th>Qty</th><th>Reason</th><th>By</th></tr></thead>
        <tbody>
          {product.movements?.map((m: any) => (
            <tr key={m.id}>
              <td>{new Date(m.created_at).toLocaleString()}</td>
              <td><span className={`badge badge-${m.movement_type === 'IN' ? 'active' : 'inactive'}`}>{m.movement_type}</span></td>
              <td>{m.quantity_changed}</td>
              <td>{m.reason || '—'}</td>
              <td>{m.created_by_name || '—'}</td>
            </tr>
          ))}
          {(!product.movements || product.movements.length === 0) && <tr><td colSpan={5} className="empty-state">No movements yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
