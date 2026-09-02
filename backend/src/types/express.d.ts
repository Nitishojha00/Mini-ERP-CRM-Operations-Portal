import 'express';

export interface AuthUser {
  id: number;
  email: string;
  role: 'Admin' | 'Sales' | 'Warehouse' | 'Accounts';
  name: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
