import { api } from './client';

export async function fetchChallans(params: { status?: string; page?: number }) {
  const res = await api.get('/challans', { params });
  return res.data as { data: any[]; meta: any };
}

export async function fetchChallan(id: number) {
  const res = await api.get(`/challans/${id}`);
  return res.data.data;
}

export async function createChallan(payload: {
  customerId: number;
  items: { productId: number; quantity: number }[];
  status: 'Draft' | 'Confirmed';
}) {
  const res = await api.post('/challans', payload);
  return res.data.data;
}

export async function confirmChallan(id: number) {
  const res = await api.post(`/challans/${id}/confirm`);
  return res.data.data;
}

export async function cancelChallan(id: number) {
  const res = await api.post(`/challans/${id}/cancel`);
  return res.data.data;
}
