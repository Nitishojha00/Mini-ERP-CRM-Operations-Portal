import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { fetchCustomers, createCustomer, Customer } from '../api/customers';
import { getErrorMessage } from '../api/client';
import { useAuth } from '../AuthContext';

const emptyForm = {
  customerName: '',
  mobileNumber: '',
  email: '',
  businessName: '',
  gstNumber: '',
  customerType: 'Retail',
  address: '',
  status: 'Lead',
  followUpDate: '',
  notes: '',
};

export default function Customers() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(params.get('status') || '');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>(emptyForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const canManage = user?.role === 'Admin' || user?.role === 'Sales';

  async function load() {
    setLoading(true);
    const res = await fetchCustomers({ search, status });
    setCustomers(res.data);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    load();
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await createCustomer(form);
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
        <h1>Customers</h1>
        {canManage && (
          <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>
            {showForm ? 'Cancel' : '+ Add Customer'}
          </button>
        )}
      </div>

      {showForm && (
        <form className="card form-grid" onSubmit={handleCreate}>
          {error && <div className="alert-error span-2">{error}</div>}
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
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label>Business name</label>
            <input value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} />
          </div>
          <div>
            <label>GST number</label>
            <input value={form.gstNumber} onChange={(e) => setForm({ ...form, gstNumber: e.target.value })} />
          </div>
          <div>
            <label>Customer type</label>
            <select value={form.customerType} onChange={(e) => setForm({ ...form, customerType: e.target.value })}>
              <option>Retail</option>
              <option>Wholesale</option>
              <option>Distributor</option>
            </select>
          </div>
          <div>
            <label>Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option>Lead</option>
              <option>Active</option>
              <option>Inactive</option>
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
            <label>Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="span-2">
            <button className="btn-primary" type="submit">Save customer</button>
          </div>
        </form>
      )}

      <form className="toolbar" onSubmit={handleSearch}>
        <input
          placeholder="Search name, mobile, or business..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={status} onChange={(e) => { setStatus(e.target.value); setParams(e.target.value ? { status: e.target.value } : {}); }}>
          <option value="">All statuses</option>
          <option>Lead</option>
          <option>Active</option>
          <option>Inactive</option>
        </select>
        <button className="btn-secondary" type="submit">Search</button>
      </form>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Mobile</th>
              <th>Business</th>
              <th>Type</th>
              <th>Status</th>
              <th>Follow-up</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id}>
                <td><Link to={`/customers/${c.id}`}>{c.customer_name}</Link></td>
                <td>{c.mobile_number}</td>
                <td>{c.business_name || '—'}</td>
                <td>{c.customer_type}</td>
                <td><span className={`badge badge-${c.status.toLowerCase()}`}>{c.status}</span></td>
                <td>{c.follow_up_date ? new Date(c.follow_up_date).toLocaleDateString() : '—'}</td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr><td colSpan={6} className="empty-state">No customers found.</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
