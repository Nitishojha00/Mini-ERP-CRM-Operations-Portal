import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { fetchChallans } from '../api/challans';

export default function Challans() {
  const [params, setParams] = useSearchParams();
  const [status, setStatus] = useState(params.get('status') || '');
  const [challans, setChallans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetchChallans({ status });
    setChallans(res.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return (
    <div className="page">
      <div className="page-header">
        <h1>Sales Challans</h1>
        <Link className="btn-primary" to="/challans/new">+ New Challan</Link>
      </div>

      <div className="toolbar">
        <select value={status} onChange={(e) => { setStatus(e.target.value); setParams(e.target.value ? { status: e.target.value } : {}); }}>
          <option value="">All statuses</option>
          <option>Draft</option>
          <option>Confirmed</option>
          <option>Cancelled</option>
        </select>
      </div>

      {loading ? <p>Loading...</p> : (
        <table className="data-table">
          <thead><tr><th>Challan #</th><th>Customer</th><th>Total qty</th><th>Status</th><th>Created</th><th>By</th></tr></thead>
          <tbody>
            {challans.map((c) => (
              <tr key={c.id}>
                <td><Link to={`/challans/${c.id}`}>{c.challan_number}</Link></td>
                <td>{c.customer_name}</td>
                <td>{c.total_quantity}</td>
                <td><span className={`badge badge-${c.status.toLowerCase()}`}>{c.status}</span></td>
                <td>{new Date(c.created_at).toLocaleDateString()}</td>
                <td>{c.created_by_name || '—'}</td>
              </tr>
            ))}
            {challans.length === 0 && <tr><td colSpan={6} className="empty-state">No challans found.</td></tr>}
          </tbody>
        </table>
      )}
    </div>
  );
}
