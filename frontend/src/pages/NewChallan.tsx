import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCustomers, Customer } from '../api/customers';
import { fetchProducts, Product } from '../api/products';
import { createChallan } from '../api/challans';
import { getErrorMessage } from '../api/client';

interface LineItem {
  productId: number;
  quantity: number;
}

export default function NewChallan() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerId, setCustomerId] = useState<number | ''>('');
  const [items, setItems] = useState<LineItem[]>([{ productId: 0, quantity: 1 }]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      const [c, p] = await Promise.all([
        fetchCustomers({ status: 'Active' }),
        fetchProducts({}),
      ]);
      setCustomers(c.data);
      setProducts(p.data);
    }
    load();
  }, []);

  function updateItem(index: number, field: keyof LineItem, value: number) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, [field]: value } : it)));
  }

  function addRow() {
    setItems((prev) => [...prev, { productId: 0, quantity: 1 }]);
  }

  function removeRow(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function productById(id: number) {
    return products.find((p) => p.id === id);
  }

  async function handleSubmit(status: 'Draft' | 'Confirmed') {
    setError('');
    if (!customerId) return setError('Please select a customer.');
    const validItems = items.filter((i) => i.productId && i.quantity > 0);
    if (validItems.length === 0) return setError('Add at least one product with a quantity.');

    setSubmitting(true);
    try {
      const challan = await createChallan({ customerId: Number(customerId), items: validItems, status });
      navigate(`/challans/${challan.id}`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const totalQty = items.reduce((sum, i) => sum + (i.quantity || 0), 0);

  return (
    <div className="page">
      <h1>New Sales Challan</h1>

      {error && <div className="alert-error">{error}</div>}

      <div className="card">
        <label>Customer *</label>
        <select value={customerId} onChange={(e) => setCustomerId(e.target.value ? Number(e.target.value) : '')}>
          <option value="">Select customer...</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>{c.customer_name} ({c.business_name || c.customer_type})</option>
          ))}
        </select>

        <h3>Products</h3>
        <table className="data-table">
          <thead><tr><th>Product</th><th>Available stock</th><th>Quantity</th><th></th></tr></thead>
          <tbody>
            {items.map((item, index) => {
              const product = productById(item.productId);
              return (
                <tr key={index}>
                  <td>
                    <select value={item.productId} onChange={(e) => updateItem(index, 'productId', Number(e.target.value))}>
                      <option value={0}>Select product...</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>{p.product_name} ({p.sku})</option>
                      ))}
                    </select>
                  </td>
                  <td>{product ? product.current_stock : '—'}</td>
                  <td>
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                    />
                  </td>
                  <td>
                    {items.length > 1 && (
                      <button type="button" className="btn-link" onClick={() => removeRow(index)}>Remove</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <button type="button" className="btn-secondary" onClick={addRow}>+ Add product row</button>

        <div className="challan-total">Total quantity: <strong>{totalQty}</strong></div>

        <div className="quick-actions">
          <button className="btn-secondary" disabled={submitting} onClick={() => handleSubmit('Draft')}>
            Save as Draft
          </button>
          <button className="btn-primary" disabled={submitting} onClick={() => handleSubmit('Confirmed')}>
            Confirm & Reduce Stock
          </button>
        </div>
      </div>
    </div>
  );
}
