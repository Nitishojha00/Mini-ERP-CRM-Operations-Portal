import { Router } from 'express';
import { z } from 'zod';
import {
  listChallans,
  getChallan,
  createChallan,
  confirmChallan,
  cancelChallan,
} from '../controllers/challan.controller';
import { validateBody } from '../middleware/validate';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);

const challanSchema = z.object({
  customerId: z.number().int().positive(),
  items: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        quantity: z.number().int().positive(),
      })
    )
    .min(1, 'At least one product is required'),
  status: z.enum(['Draft', 'Confirmed']).default('Draft'),
});

// All roles can view; Admin + Sales create/manage challans.
router.get('/', listChallans);
router.get('/:id', getChallan);
router.post('/', authorize('Admin', 'Sales'), validateBody(challanSchema), createChallan);
router.post('/:id/confirm', authorize('Admin', 'Sales', 'Warehouse'), confirmChallan);
router.post('/:id/cancel', authorize('Admin', 'Sales'), cancelChallan);

export default router;
