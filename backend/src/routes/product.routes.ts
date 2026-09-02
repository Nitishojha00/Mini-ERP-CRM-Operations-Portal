import { Router } from 'express';
import { z } from 'zod';
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  addStockMovement,
} from '../controllers/product.controller';
import { validateBody } from '../middleware/validate';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);

const productSchema = z.object({
  productName: z.string().min(1),
  sku: z.string().min(1),
  category: z.string().optional(),
  unitPrice: z.number().nonnegative(),
  currentStock: z.number().int().nonnegative().optional(),
  minStockAlert: z.number().int().nonnegative().optional(),
  location: z.string().optional(),
});

const updateProductSchema = productSchema.omit({ sku: true, currentStock: true });

const stockMovementSchema = z.object({
  quantityChanged: z.number().int().positive(),
  movementType: z.enum(['IN', 'OUT']),
  reason: z.string().optional(),
});

// All roles can view; Admin + Warehouse manage products/stock.
router.get('/', listProducts);
router.get('/:id', getProduct);
router.post('/', authorize('Admin', 'Warehouse'), validateBody(productSchema), createProduct);
router.put('/:id', authorize('Admin', 'Warehouse'), validateBody(updateProductSchema), updateProduct);
router.post(
  '/:id/stock-movement',
  authorize('Admin', 'Warehouse'),
  validateBody(stockMovementSchema),
  addStockMovement
);

export default router;
