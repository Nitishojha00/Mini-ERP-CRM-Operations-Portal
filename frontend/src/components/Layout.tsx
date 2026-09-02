import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">Mini ERP + CRM</div>
        <nav>
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
            Dashboard
          </NavLink>
          <NavLink to="/customers" className={({ isActive }) => (isActive ? 'active' : '')}>
            Customers
          </NavLink>
          <NavLink to="/products" className={({ isActive }) => (isActive ? 'active' : '')}>
            Products & Stock
          </NavLink>
          <NavLink to="/challans" className={({ isActive }) => (isActive ? 'active' : '')}>
            Sales Challans
          </NavLink>
        </nav>
        <div className="sidebar-footer">
          <div className="user-chip">
            <div className="avatar">{user?.name?.[0] ?? '?'}</div>
            <div>
              <div className="user-name">{user?.name}</div>
              <div className="user-role">{user?.role}</div>
            </div>
          </div>
          <button className="btn-secondary" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}
