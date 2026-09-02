import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchCustomer, updateCustomer, addFollowup } from '../api/customers';
import { getErrorMessage } from '../api/client';
import { useAuth } from '../AuthContext';

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [customer, setCustomer] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const canManage = user?.role === 'Admin' || user?.role === 'Sales';

  async function load() {
    const data = await fetchCustomer(Number(id));
    setCustomer(data);
    setForm({
      customerName: data.customer_name,
      mobileNumber: data.mobile_number,
      email: data.email || '',
      businessName: data.business_name || '',
      gstNumber: data.gst_number || '',
      customerType: data.customer_type,
      address: data.address || '',
      status: data.status,
      followUpDate: data.follow_up_date ? data.follow_up_date.substring(0, 10) : '',
      notes: data.notes || '',
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
      await updateCustomer(Number(id), form);
      setEditing(false);
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    try {
      await addFollowup(Number(id), note);
      setNote('');
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  if (!customer || !form) return <div className="page">Loading...</div>;

  return (
    <div className="page">
      <button className="btn-link" onClick={() => navigate('/customers')}>&larr; Back to customers</button>
      <div className="page-header">
        <h1>{customer.customer_name}</h1>
        {canManage && (
          <button className="btn-secondary" onClick={() => setEditing((e) => !e)}>
            {editing ? 'Cancel' : 'Edit'}
          </button>
        )}
      </div>

      {error && <div className="alert-error">{error}</div>}

      {editing ? (
        <form className="card form-grid" onSubmit={handleSave}>
          <div>
            <label>Customer name *</label>
            <input required value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
          </div>
          <div>
            <label>Mobile number *</label>
            <input required value={form.mobileNumber} onChange={(e) => setForm({ ...form, mobileNumber: e.target.value })} />
          </div>
          <div>
            <label>Email</label>
            <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label>Business name</label>
            <input value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} />
          </div>
          <div>
            <label>Customer type</label>
            <select value={form.customerType} onChange={(e) => setForm({ ...form, customerType: e.target.value })}>
              <option>Retail</option><option>Wholesale</option><option>Distributor</option>
            </select>
          </div>
          <div>
            <label>Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option>Lead</option><option>Active</option><option>Inactive</option>
            </select>
          </div>
          <div>
            <label>Follow-up date</label>
            <input type="date" value={form.followUpDate} onChange={(e) => setForm({ ...form, followUpDate: e.target.value })} />
          </div>
          <div className="span-2">
            <label>Address</label>
            <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div className="span-2">
            <button className="btn-primary" type="submit">Save changes</button>
          </div>
        </form>
      ) : (
        <div className="card detail-grid">
          <div><span className="detail-label">Mobile</span>{customer.mobile_number}</div>
          <div><span className="detail-label">Email</span>{customer.email || '—'}</div>
          <div><span className="detail-label">Business</span>{customer.business_name || '—'}</div>
          <div><span className="detail-label">GST</span>{customer.gst_number || '—'}</div>
          <div><span className="detail-label">Type</span>{customer.customer_type}</div>
          <div><span className="detail-label">Status</span><span className={`badge badge-${customer.status.toLowerCase()}`}>{customer.status}</span></div>
          <div><span className="detail-label">Follow-up</span>{customer.follow_up_date ? new Date(customer.follow_up_date).toLocaleDateString() : '—'}</div>
          <div className="span-2"><span className="detail-label">Address</span>{customer.address || '—'}</div>
          <div className="span-2"><span className="detail-label">Notes</span>{customer.notes || '—'}</div>
        </div>
      )}

      <h2>Follow-up history</h2>
      {canManage && (
        <form className="inline-form" onSubmit={handleAddNote}>
          <input placeholder="Add a follow-up note..." value={note} onChange={(e) => setNote(e.target.value)} />
          <button className="btn-primary" type="submit">Add</button>
        </form>
      )}
      <ul className="timeline">
        {customer.followups?.map((f: any) => (
          <li key={f.id}>
            <div className="timeline-note">{f.note}</div>
            <div className="timeline-meta">{new Date(f.created_at).toLocaleString()}</div>
          </li>
        ))}
        {(!customer.followups || customer.followups.length === 0) && <li className="empty-state">No follow-ups yet.</li>}
      </ul>
    </div>
  );
}
