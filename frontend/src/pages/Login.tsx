import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/auth';
import { useAuth } from '../AuthContext';
import { getErrorMessage } from '../api/client';

export default function Login() {
  const [email, setEmail] = useState('admin@demo.com');
  const [password, setPassword] = useState('Passw0rd!');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token, user } = await login(email, password);
      setAuth(token, user);
      navigate('/');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>Mini ERP + CRM</h1>
        <p className="subtitle">Operations Portal — sign in to continue</p>

        {error && <div className="alert-error">{error}</div>}

        <label>Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />

        <label>Password</label>
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />

        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign in'}
        </button>

        <div className="demo-hint">
          <strong>Demo accounts</strong> (password: <code>Passw0rd!</code>)
          <ul>
            <li>admin@demo.com — Admin</li>
            <li>sales@demo.com — Sales</li>
            <li>warehouse@demo.com — Warehouse</li>
            <li>accounts@demo.com — Accounts</li>
          </ul>
        </div>
      </form>
    </div>
  );
}
