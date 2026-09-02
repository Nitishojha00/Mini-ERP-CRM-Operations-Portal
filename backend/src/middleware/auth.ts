import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from './errorHandler';
import { AuthUser } from '../types/express';

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(new ApiError(401, 'Missing or invalid Authorization header'));
  }
  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as AuthUser;
    req.user = payload;
    next();
  } catch (err) {
    return next(new ApiError(401, 'Invalid or expired token'));
  }
}

export function authorize(...allowedRoles: AuthUser['role'][]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return next(new ApiError(401, 'Not authenticated'));
    if (!allowedRoles.includes(req.user.role)) {
      return next(new ApiError(403, `Role '${req.user.role}' is not permitted to perform this action`));
    }
    next();
  };
}
