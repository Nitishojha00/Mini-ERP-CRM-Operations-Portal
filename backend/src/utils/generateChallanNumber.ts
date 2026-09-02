import pool from '../config/db';

// Generates a sequential challan number like CH-2026-0001
export async function generateChallanNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const result = await pool.query(
    `SELECT COUNT(*)::int AS count FROM challans WHERE challan_number LIKE $1`,
    [`CH-${year}-%`]
  );
  const nextSeq = (result.rows[0].count as number) + 1;
  return `CH-${year}-${String(nextSeq).padStart(4, '0')}`;
}
