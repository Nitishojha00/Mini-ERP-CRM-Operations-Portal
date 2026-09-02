import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Challans from './pages/Challans';
import ChallanDetail from './pages/ChallanDetail';
import NewChallan from './pages/NewChallan';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

function Shell({ children }: { children: React.ReactElement }) {
  return (
    <ProtectedRoute>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Shell><Dashboard /></Shell>} />
      <Route path="/customers" element={<Shell><Customers /></Shell>} />
      <Route path="/customers/:id" element={<Shell><CustomerDetail /></Shell>} />
      <Route path="/products" element={<Shell><Products /></Shell>} />
      <Route path="/products/:id" element={<Shell><ProductDetail /></Shell>} />
      <Route path="/challans" element={<Shell><Challans /></Shell>} />
      <Route path="/challans/new" element={<Shell><NewChallan /></Shell>} />
      <Route path="/challans/:id" element={<Shell><ChallanDetail /></Shell>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
