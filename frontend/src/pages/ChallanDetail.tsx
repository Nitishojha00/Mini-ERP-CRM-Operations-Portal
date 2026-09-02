import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchChallan, confirmChallan, cancelChallan } from '../api/challans';
import { getErrorMessage } from '../api/client';
import { useAuth } from '../AuthContext';

export default function ChallanDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [challan, setChallan] = useState<any>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const canManage = ['Admin', 'Sales', 'Warehouse'].includes(user?.role || '');

  async function load() {
    const data = await fetchChallan(Number(id));
    setChallan(data);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleConfirm() {
    setError('');
    setBusy(true);
    try {
      await confirmChallan(Number(id));
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel() {
    setError('');
    setBusy(true);
    try {
      await cancelChallan(Number(id));
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (!challan) return <div className="page">Loading...</div>;

  return (
    <div className="page">
      <button className="btn-link" onClick={() => navigate('/challans')}>&larr; Back to challans</button>
      <div className="page-header">
        <h1>{challan.challan_number}</h1>
        <span className={`badge badge-${challan.status.toLowerCase()}`}>{challan.status}</span>
      </div>

      {error && <div className="alert-error">{error}</div>}

      <div className="card detail-grid">
        <div><span className="detail-label">Customer</span>{challan.customer_name}</div>
        <div><span className="detail-label">Mobile</span>{challan.mobile_number}</div>
        <div><span className="detail-label">Business</span>{challan.business_name || '—'}</div>
        <div><span className="detail-label">Total quantity</span>{challan.total_quantity}</div>
        <div><span className="detail-label">Created</span>{new Date(challan.created_at).toLocaleString()}</div>
        <div><span className="detail-label">Confirmed at</span>{challan.confirmed_at ? new Date(challan.confirmed_at).toLocaleString() : '—'}</div>
      </div>

      <h2>Items</h2>
      <table className="data-table">
        <thead><tr><th>Product</th><th>SKU</th><th>Unit price</th><th>Qty</th><th>Subtotal</th></tr></thead>
        <tbody>
          {challan.items?.map((it: any) => (
            <tr key={it.id}>
              <td>{it.product_name_snapshot}</td>
              <td>{it.sku_snapshot}</td>
              <td>₹{Number(it.unit_price_snapshot).toFixed(2)}</td>
              <td>{it.quantity}</td>
              <td>₹{(Number(it.unit_price_snapshot) * it.quantity).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {canManage && challan.status === 'Draft' && (
        <div className="quick-actions">
          <button className="btn-primary" disabled={busy} onClick={handleConfirm}>
            Confirm & Reduce Stock
          </button>
          <button className="btn-secondary" disabled={busy} onClick={handleCancel}>
            Cancel Challan
          </button>
        </div>
      )}
      {canManage && challan.status === 'Confirmed' && (
        <div className="quick-actions">
          <button className="btn-secondary" disabled={busy} onClick={handleCancel}>
            Cancel Challan (restock items)
          </button>
        </div>
      )}
    </div>
  );
}
