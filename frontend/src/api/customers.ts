import { api } from './client';

export interface Customer {
  id: number;
  customer_name: string;
  mobile_number: string;
  email: string | null;
  business_name: string | null;
  gst_number: string | null;
  customer_type: 'Retail' | 'Wholesale' | 'Distributor';
  address: string | null;
  status: 'Lead' | 'Active' | 'Inactive';
  follow_up_date: string | null;
  notes: string | null;
  created_at: string;
}

export async function fetchCustomers(params: { search?: string; status?: string; page?: number }) {
  const res = await api.get('/customers', { params });
  return res.data as { data: Customer[]; meta: any };
}

export async function fetchCustomer(id: number) {
  const res = await api.get(`/customers/${id}`);
  return res.data.data;
}

export async function createCustomer(payload: any) {
  const res = await api.post('/customers', payload);
  return res.data.data as Customer;
}

export async function updateCustomer(id: number, payload: any) {
  const res = await api.put(`/customers/${id}`, payload);
  return res.data.data as Customer;
}

export async function addFollowup(id: number, note: string, followUpDate?: string) {
  const res = await api.post(`/customers/${id}/followups`, { note, followUpDate });
  return res.data.data;
}
