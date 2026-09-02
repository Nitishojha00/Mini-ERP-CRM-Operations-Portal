/**
 * Seeds demo users for all 4 roles + sample customers/products.
 * Run with: npm run seed
 */
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import pool from '../config/db';

dotenv.config();

const DEMO_PASSWORD = 'Passw0rd!';

const demoUsers = [
  { name: 'Admin User', email: 'admin@demo.com', role: 'Admin' },
  { name: 'Sales User', email: 'sales@demo.com', role: 'Sales' },
  { name: 'Warehouse User', email: 'warehouse@demo.com', role: 'Warehouse' },
  { name: 'Accounts User', email: 'accounts@demo.com', role: 'Accounts' },
];

async function seed() {
  const client = await pool.connect();
  try {
    console.log('Seeding users...');
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

    for (const u of demoUsers) {
      await client.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (email) DO NOTHING`,
        [u.name, u.email, passwordHash, u.role]
      );
    }

    console.log('Seeding sample customers...');
    await client.query(`
      INSERT INTO customers (customer_name, mobile_number, email, business_name, gst_number, customer_type, address, status, follow_up_date, notes)
      SELECT * FROM (VALUES
        ('Ramesh Traders', '9876543210', 'ramesh@example.com', 'Ramesh Traders Pvt Ltd', '09ABCDE1234F1Z5', 'Wholesale'::customer_type, 'MG Road, Gorakhpur, UP', 'Active'::customer_status, (CURRENT_DATE + INTERVAL '7 day')::date, 'Regular bulk buyer, prefers monthly billing'),
        ('Sunrise Distributors', '9123456780', 'sunrise@example.com', 'Sunrise Distribution Co', NULL, 'Distributor'::customer_type, 'Sector 5, Noida, UP', 'Lead'::customer_status, (CURRENT_DATE + INTERVAL '3 day')::date, 'Interested in electronics category'),
        ('Anita Retail Store', '9988776655', 'anita@example.com', 'Anita General Store', NULL, 'Retail'::customer_type, 'Civil Lines, Gorakhpur, UP', 'Active'::customer_status, NULL, 'Small retail shop, cash payments only')
      ) AS v(customer_name, mobile_number, email, business_name, gst_number, customer_type, address, status, follow_up_date, notes)
      WHERE NOT EXISTS (SELECT 1 FROM customers WHERE customers.customer_name = v.customer_name);
    `);

    console.log('Seeding sample products...');
    await client.query(`
      INSERT INTO products (product_name, sku, category, unit_price, current_stock, min_stock_alert, location)
      SELECT * FROM (VALUES
        ('LED Bulb 9W', 'LED-9W-001', 'Electricals', 85.00, 500, 50, 'Warehouse A - Rack 1'),
        ('Ceiling Fan 48in', 'FAN-48-002', 'Electricals', 1450.00, 60, 10, 'Warehouse A - Rack 5'),
        ('Copper Wire 1.5mm (100m)', 'WIRE-1.5-003', 'Wiring', 2200.00, 25, 5, 'Warehouse B - Rack 2'),
        ('MCB Switch 32A', 'MCB-32-004', 'Switchgear', 320.00, 8, 10, 'Warehouse B - Rack 3')
      ) AS v(product_name, sku, category, unit_price, current_stock, min_stock_alert, location)
      WHERE NOT EXISTS (SELECT 1 FROM products WHERE products.sku = v.sku);
    `);

    console.log('Seed complete. Demo login credentials (password for all: ' + DEMO_PASSWORD + '):');
    demoUsers.forEach((u) => console.log(`  ${u.role}: ${u.email}`));
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
