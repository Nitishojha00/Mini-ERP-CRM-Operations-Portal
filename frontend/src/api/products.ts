import { api } from './client';

export interface Product {
  id: number;
  product_name: string;
  sku: string;
  category: string | null;
  unit_price: string;
  current_stock: number;
  min_stock_alert: number;
  location: string | null;
  created_at: string;
}

export async function fetchProducts(params: { search?: string; lowStock?: boolean; page?: number }) {
  const res = await api.get('/products', { params });
  return res.data as { data: Product[]; meta: any };
}

export async function fetchProduct(id: number) {
  const res = await api.get(`/products/${id}`);
  return res.data.data;
}

export async function createProduct(payload: any) {
  const res = await api.post('/products', payload);
  return res.data.data as Product;
}

export async function updateProduct(id: number, payload: any) {
  const res = await api.put(`/products/${id}`, payload);
  return res.data.data as Product;
}

export async function addStockMovement(id: number, payload: any) {
  const res = await api.post(`/products/${id}/stock-movement`, payload);
  return res.data.data;
}
