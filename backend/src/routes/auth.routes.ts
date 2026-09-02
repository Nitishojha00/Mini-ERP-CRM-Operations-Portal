import { Router } from 'express';
import { z } from 'zod';
import { login, me } from '../controllers/auth.controller';
import { validateBody } from '../middleware/validate';
import { authenticate } from '../middleware/auth';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
});

router.post('/login', validateBody(loginSchema), login);
router.get('/me', authenticate, me);

export default router;
