import { Request, Response } from 'express';
import pool from '../config/db';
import { asyncHandler, ApiError } from '../middleware/errorHandler';
import { getPagination, buildPaginationMeta } from '../utils/pagination';

export const listProducts = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, offset } = getPagination(req);
  const search = (req.query.search as string) || '';
  const category = (req.query.category as string) || '';
  const lowStock = req.query.lowStock === 'true';

  const conditions: string[] = [];
  const params: any[] = [];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(product_name ILIKE $${params.length} OR sku ILIKE $${params.length})`);
  }
  if (category) {
    params.push(category);
    conditions.push(`category = $${params.length}`);
  }
  if (lowStock) {
    conditions.push(`current_stock <= min_stock_alert`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await pool.query(`SELECT COUNT(*)::int AS total FROM products ${where}`, params);
  const total = countResult.rows[0].total;

  params.push(limit, offset);
  const dataResult = await pool.query(
    `SELECT * FROM products ${where} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  res.json({ success: true, data: dataResult.rows, meta: buildPaginationMeta(page, limit, total) });
});

export const getProduct = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
  if (!result.rows[0]) throw new ApiError(404, 'Product not found');

  const movements = await pool.query(
    `SELECT sm.*, u.name AS created_by_name FROM stock_movements sm
     LEFT JOIN users u ON u.id = sm.created_by
     WHERE product_id = $1 ORDER BY sm.created_at DESC LIMIT 50`,
    [id]
  );

  res.json({ success: true, data: { ...result.rows[0], movements: movements.rows } });
});

export const createProduct = asyncHandler(async (req: Request, res: Response) => {
  const b = req.body;

  const skuExists = await pool.query('SELECT id FROM products WHERE sku = $1', [b.sku]);
  if (skuExists.rows[0]) throw new ApiError(409, `SKU '${b.sku}' already exists`);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `INSERT INTO products
        (product_name, sku, category, unit_price, current_stock, min_stock_alert, location, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [b.productName, b.sku, b.category || null, b.unitPrice, b.currentStock || 0, b.minStockAlert || 0, b.location || null, req.user!.id]
    );

    if ((b.currentStock || 0) > 0) {
      await client.query(
        `INSERT INTO stock_movements (product_id, quantity_changed, movement_type, reason, created_by)
         VALUES ($1, $2, 'IN', 'Initial stock on product creation', $3)`,
        [result.rows[0].id, b.currentStock, req.user!.id]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

export const updateProduct = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const existing = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
  if (!existing.rows[0]) throw new ApiError(404, 'Product not found');

  const b = req.body;
  const result = await pool.query(
    `UPDATE products SET
      product_name = $1, category = $2, unit_price = $3, min_stock_alert = $4, location = $5, updated_at = now()
     WHERE id = $6
     RETURNING *`,
    [b.productName, b.category || null, b.unitPrice, b.minStockAlert || 0, b.location || null, id]
  );
  // Note: current_stock is intentionally NOT editable here directly — it must change
  // via the /stock-movement endpoint so every change is logged.
  res.json({ success: true, data: result.rows[0] });
});

export const addStockMovement = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { quantityChanged, movementType, reason } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const productResult = await client.query('SELECT * FROM products WHERE id = $1 FOR UPDATE', [id]);
    const product = productResult.rows[0];
    if (!product) throw new ApiError(404, 'Product not found');

    const delta = movementType === 'IN' ? quantityChanged : -quantityChanged;
    const newStock = product.current_stock + delta;

    if (newStock < 0) {
      throw new ApiError(400, `Insufficient stock. Current stock: ${product.current_stock}, requested OUT: ${quantityChanged}`);
    }

    await client.query('UPDATE products SET current_stock = $1, updated_at = now() WHERE id = $2', [newStock, id]);

    const movement = await client.query(
      `INSERT INTO stock_movements (product_id, quantity_changed, movement_type, reason, created_by)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [id, quantityChanged, movementType, reason || null, req.user!.id]
    );

    await client.query('COMMIT');
    res.status(201).json({ success: true, data: { movement: movement.rows[0], newStock } });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});
