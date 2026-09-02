import jwt from 'jsonwebtoken';
import { AuthUser } from '../types/express';

export function signToken(user: AuthUser): string {
  return jwt.sign(user, process.env.JWT_SECRET as string, {
    expiresIn: (process.env.JWT_EXPIRES_IN || '8h') as any,
  });
}
