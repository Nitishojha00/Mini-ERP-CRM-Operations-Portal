import { Request, Response } from 'express';
import pool from '../config/db';
import { asyncHandler, ApiError } from '../middleware/errorHandler';
import { getPagination, buildPaginationMeta } from '../utils/pagination';
import { generateChallanNumber } from '../utils/generateChallanNumber';

export const listChallans = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, offset } = getPagination(req);
  const status = (req.query.status as string) || '';
  const customerId = (req.query.customerId as string) || '';

  const conditions: string[] = [];
  const params: any[] = [];

  if (status) {
    params.push(status);
    conditions.push(`c.status = $${params.length}`);
  }
  if (customerId) {
    params.push(customerId);
    conditions.push(`c.customer_id = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await pool.query(`SELECT COUNT(*)::int AS total FROM challans c ${where}`, params);
  const total = countResult.rows[0].total;

  params.push(limit, offset);
  const dataResult = await pool.query(
    `SELECT c.*, cu.customer_name, u.name AS created_by_name
     FROM challans c
     JOIN customers cu ON cu.id = c.customer_id
     LEFT JOIN users u ON u.id = c.created_by
     ${where}
     ORDER BY c.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  res.json({ success: true, data: dataResult.rows, meta: buildPaginationMeta(page, limit, total) });
});

export const getChallan = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const challanResult = await pool.query(
    `SELECT c.*, cu.customer_name, cu.mobile_number, cu.business_name
     FROM challans c JOIN customers cu ON cu.id = c.customer_id
     WHERE c.id = $1`,
    [id]
  );
  if (!challanResult.rows[0]) throw new ApiError(404, 'Challan not found');

  const items = await pool.query('SELECT * FROM challan_items WHERE challan_id = $1', [id]);

  res.json({ success: true, data: { ...challanResult.rows[0], items: items.rows } });
});

// Create a challan. status = 'Draft' or 'Confirmed'.
// Stock is only reduced when status = 'Confirmed'. Stock must never go negative.
export const createChallan = asyncHandler(async (req: Request, res: Response) => {
  const { customerId, items, status } = req.body as {
    customerId: number;
    items: { productId: number; quantity: number }[];
    status: 'Draft' | 'Confirmed';
  };

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const customerCheck = await client.query('SELECT id FROM customers WHERE id = $1', [customerId]);
    if (!customerCheck.rows[0]) throw new ApiError(404, 'Customer not found');

    // Lock the involved product rows to prevent race conditions on stock.
    const productIds = items.map((i) => i.productId);
    const productsResult = await client.query(
      `SELECT * FROM products WHERE id = ANY($1::int[]) FOR UPDATE`,
      [productIds]
    );
    const productsById = new Map(productsResult.rows.map((p: any) => [p.id, p]));

    for (const item of items) {
      const product = productsById.get(item.productId);
      if (!product) throw new ApiError(404, `Product with id ${item.productId} not found`);
      if (status === 'Confirmed' && product.current_stock < item.quantity) {
        throw new ApiError(
          400,
          `Insufficient stock for '${product.product_name}' (SKU ${product.sku}). Available: ${product.current_stock}, requested: ${item.quantity}`
        );
      }
    }

    const challanNumber = await generateChallanNumber();
    const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);

    const challanResult = await client.query(
      `INSERT INTO challans (challan_number, customer_id, total_quantity, status, created_by, confirmed_at)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [challanNumber, customerId, totalQuantity, status, req.user!.id, status === 'Confirmed' ? new Date() : null]
    );
    const challan = challanResult.rows[0];

    for (const item of items) {
      const product = productsById.get(item.productId)!;
      await client.query(
        `INSERT INTO challan_items (challan_id, product_id, product_name_snapshot, sku_snapshot, unit_price_snapshot, quantity)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [challan.id, product.id, product.product_name, product.sku, product.unit_price, item.quantity]
      );

      if (status === 'Confirmed') {
        const newStock = product.current_stock - item.quantity;
        await client.query('UPDATE products SET current_stock = $1, updated_at = now() WHERE id = $2', [
          newStock,
          product.id,
        ]);
        await client.query(
          `INSERT INTO stock_movements (product_id, quantity_changed, movement_type, reason, created_by)
           VALUES ($1,$2,'OUT',$3,$4)`,
          [product.id, item.quantity, `Sales challan ${challanNumber}`, req.user!.id]
        );
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ success: true, data: { ...challan, items } });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

// Confirm a Draft challan: reduces stock at this point (never goes negative).
export const confirmChallan = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const challanResult = await client.query('SELECT * FROM challans WHERE id = $1 FOR UPDATE', [id]);
    const challan = challanResult.rows[0];
    if (!challan) throw new ApiError(404, 'Challan not found');
    if (challan.status !== 'Draft') throw new ApiError(400, `Only Draft challans can be confirmed. Current status: ${challan.status}`);

    const itemsResult = await client.query('SELECT * FROM challan_items WHERE challan_id = $1', [id]);
    const items = itemsResult.rows;

    const productIds = items.map((i: any) => i.product_id);
    const productsResult = await client.query(`SELECT * FROM products WHERE id = ANY($1::int[]) FOR UPDATE`, [
      productIds,
    ]);
    const productsById = new Map(productsResult.rows.map((p: any) => [p.id, p]));

    for (const item of items) {
      const product = productsById.get(item.product_id);
      if (!product) throw new ApiError(404, `Product ${item.product_id} no longer exists`);
      if (product.current_stock < item.quantity) {
        throw new ApiError(
          400,
          `Insufficient stock for '${item.product_name_snapshot}' (SKU ${item.sku_snapshot}). Available: ${product.current_stock}, requested: ${item.quantity}`
        );
      }
    }

    for (const item of items) {
      const product = productsById.get(item.product_id)!;
      const newStock = product.current_stock - item.quantity;
      await client.query('UPDATE products SET current_stock = $1, updated_at = now() WHERE id = $2', [
        newStock,
        product.id,
      ]);
      await client.query(
        `INSERT INTO stock_movements (product_id, quantity_changed, movement_type, reason, created_by)
         VALUES ($1,$2,'OUT',$3,$4)`,
        [product.id, item.quantity, `Sales challan ${challan.challan_number} confirmed`, req.user!.id]
      );
    }

    const updated = await client.query(
      `UPDATE challans SET status = 'Confirmed', confirmed_at = now() WHERE id = $1 RETURNING *`,
      [id]
    );

    await client.query('COMMIT');
    res.json({ success: true, data: updated.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

export const cancelChallan = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const challanResult = await client.query('SELECT * FROM challans WHERE id = $1 FOR UPDATE', [id]);
    const challan = challanResult.rows[0];
    if (!challan) throw new ApiError(404, 'Challan not found');
    if (challan.status === 'Cancelled') throw new ApiError(400, 'Challan already cancelled');

    // If it was Confirmed, restock the items (reverse the OUT movement).
    if (challan.status === 'Confirmed') {
      const itemsResult = await client.query('SELECT * FROM challan_items WHERE challan_id = $1', [id]);
      for (const item of itemsResult.rows) {
        await client.query('UPDATE products SET current_stock = current_stock + $1, updated_at = now() WHERE id = $2', [
          item.quantity,
          item.product_id,
        ]);
        await client.query(
          `INSERT INTO stock_movements (product_id, quantity_changed, movement_type, reason, created_by)
           VALUES ($1,$2,'IN',$3,$4)`,
          [item.product_id, item.quantity, `Reversal - challan ${challan.challan_number} cancelled`, req.user!.id]
        );
      }
    }

    const updated = await client.query(`UPDATE challans SET status = 'Cancelled' WHERE id = $1 RETURNING *`, [id]);
    await client.query('COMMIT');
    res.json({ success: true, data: updated.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});
