import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/db';
import { asyncHandler, ApiError } from '../middleware/errorHandler';
import { signToken } from '../utils/jwt';

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = result.rows[0];

  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const authUser = { id: user.id, email: user.email, role: user.role, name: user.name };
  const token = signToken(authUser);

  res.json({ success: true, data: { token, user: authUser } });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: req.user });
});
