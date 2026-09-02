import { Request, Response } from 'express';
import pool from '../config/db';
import { asyncHandler, ApiError } from '../middleware/errorHandler';
import { getPagination, buildPaginationMeta } from '../utils/pagination';

export const listCustomers = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, offset } = getPagination(req);
  const search = (req.query.search as string) || '';
  const status = (req.query.status as string) || '';

  const conditions: string[] = [];
  const params: any[] = [];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(
      `(customer_name ILIKE $${params.length} OR mobile_number ILIKE $${params.length} OR business_name ILIKE $${params.length})`
    );
  }
  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await pool.query(`SELECT COUNT(*)::int AS total FROM customers ${where}`, params);
  const total = countResult.rows[0].total;

  params.push(limit, offset);
  const dataResult = await pool.query(
    `SELECT * FROM customers ${where} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  res.json({ success: true, data: dataResult.rows, meta: buildPaginationMeta(page, limit, total) });
});

export const getCustomer = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await pool.query('SELECT * FROM customers WHERE id = $1', [id]);
  if (!result.rows[0]) throw new ApiError(404, 'Customer not found');

  const followups = await pool.query(
    'SELECT * FROM customer_followups WHERE customer_id = $1 ORDER BY created_at DESC',
    [id]
  );

  res.json({ success: true, data: { ...result.rows[0], followups: followups.rows } });
});

export const createCustomer = asyncHandler(async (req: Request, res: Response) => {
  const b = req.body;
  const result = await pool.query(
    `INSERT INTO customers
      (customer_name, mobile_number, email, business_name, gst_number, customer_type, address, status, follow_up_date, notes, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING *`,
    [
      b.customerName,
      b.mobileNumber,
      b.email || null,
      b.businessName || null,
      b.gstNumber || null,
      b.customerType,
      b.address || null,
      b.status,
      b.followUpDate || null,
      b.notes || null,
      req.user!.id,
    ]
  );
  res.status(201).json({ success: true, data: result.rows[0] });
});

export const updateCustomer = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const existing = await pool.query('SELECT id FROM customers WHERE id = $1', [id]);
  if (!existing.rows[0]) throw new ApiError(404, 'Customer not found');

  const b = req.body;
  const result = await pool.query(
    `UPDATE customers SET
      customer_name = $1, mobile_number = $2, email = $3, business_name = $4,
      gst_number = $5, customer_type = $6, address = $7, status = $8,
      follow_up_date = $9, notes = $10, updated_at = now()
     WHERE id = $11
     RETURNING *`,
    [
      b.customerName,
      b.mobileNumber,
      b.email || null,
      b.businessName || null,
      b.gstNumber || null,
      b.customerType,
      b.address || null,
      b.status,
      b.followUpDate || null,
      b.notes || null,
      id,
    ]
  );
  res.json({ success: true, data: result.rows[0] });
});

export const addFollowup = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { note, followUpDate } = req.body;

  const existing = await pool.query('SELECT id FROM customers WHERE id = $1', [id]);
  if (!existing.rows[0]) throw new ApiError(404, 'Customer not found');

  const result = await pool.query(
    `INSERT INTO customer_followups (customer_id, note, follow_up_date, created_by)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [id, note, followUpDate || null, req.user!.id]
  );

  if (followUpDate) {
    await pool.query('UPDATE customers SET follow_up_date = $1, updated_at = now() WHERE id = $2', [
      followUpDate,
      id,
    ]);
  }

  res.status(201).json({ success: true, data: result.rows[0] });
});
