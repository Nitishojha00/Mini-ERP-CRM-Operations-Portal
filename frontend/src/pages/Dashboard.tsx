import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchCustomers } from '../api/customers';
import { fetchProducts } from '../api/products';
import { fetchChallans } from '../api/challans';
import { useAuth } from '../AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    customers: 0,
    leads: 0,
    lowStockProducts: 0,
    draftChallans: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [customersAll, leads, lowStock, drafts] = await Promise.all([
        fetchCustomers({}),
        fetchCustomers({ status: 'Lead' }),
        fetchProducts({ lowStock: true }),
        fetchChallans({ status: 'Draft' }),
      ]);
      setStats({
        customers: customersAll.meta.total,
        leads: leads.meta.total,
        lowStockProducts: lowStock.meta.total,
        draftChallans: drafts.meta.total,
      });
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="page">
      <h1>Welcome, {user?.name}</h1>
      <p className="muted">Role: {user?.role} — here's a quick snapshot of the business.</p>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="stat-grid">
          <Link to="/customers" className="stat-card">
            <div className="stat-value">{stats.customers}</div>
            <div className="stat-label">Total customers</div>
          </Link>
          <Link to="/customers?status=Lead" className="stat-card">
            <div className="stat-value">{stats.leads}</div>
            <div className="stat-label">Open leads</div>
          </Link>
          <Link to="/products?lowStock=true" className="stat-card warn">
            <div className="stat-value">{stats.lowStockProducts}</div>
            <div className="stat-label">Products low on stock</div>
          </Link>
          <Link to="/challans?status=Draft" className="stat-card">
            <div className="stat-value">{stats.draftChallans}</div>
            <div className="stat-label">Draft challans</div>
          </Link>
        </div>
      )}

      <div className="quick-actions">
        <Link className="btn-primary" to="/challans/new">
          + New Sales Challan
        </Link>
        <Link className="btn-secondary" to="/customers">
          + Add Customer
        </Link>
        <Link className="btn-secondary" to="/products">
          + Add Product
        </Link>
      </div>
    </div>
  );
}
