import { api } from './client';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: 'Admin' | 'Sales' | 'Warehouse' | 'Accounts';
}

export async function login(email: string, password: string) {
  const res = await api.post('/auth/login', { email, password });
  return res.data.data as { token: string; user: AuthUser };
}
