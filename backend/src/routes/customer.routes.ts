import { Router } from 'express';
import { z } from 'zod';
import {
  listCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  addFollowup,
} from '../controllers/customer.controller';
import { validateBody } from '../middleware/validate';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);

const customerSchema = z.object({
  customerName: z.string().min(1),
  mobileNumber: z.string().min(6),
  email: z.string().email().optional().or(z.literal('')),
  businessName: z.string().optional(),
  gstNumber: z.string().optional(),
  customerType: z.enum(['Retail', 'Wholesale', 'Distributor']),
  address: z.string().optional(),
  status: z.enum(['Lead', 'Active', 'Inactive']),
  followUpDate: z.string().optional(),
  notes: z.string().optional(),
});

const followupSchema = z.object({
  note: z.string().min(1),
  followUpDate: z.string().optional(),
});

// All roles can view; Admin + Sales manage customers.
router.get('/', listCustomers);
router.get('/:id', getCustomer);
router.post('/', authorize('Admin', 'Sales'), validateBody(customerSchema), createCustomer);
router.put('/:id', authorize('Admin', 'Sales'), validateBody(customerSchema), updateCustomer);
router.post('/:id/followups', authorize('Admin', 'Sales'), validateBody(followupSchema), addFollowup);

export default router;
