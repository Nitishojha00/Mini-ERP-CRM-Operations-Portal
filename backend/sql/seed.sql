-- Demo seed data. Passwords below are all: Passw0rd!
-- (hash generated for bcrypt cost 10 - see src/utils/seed.ts to regenerate if needed)

-- NOTE: Prefer running `npm run seed` (src/utils/seed.ts) which hashes passwords at runtime.
-- This file is kept as a reference / fallback for manual psql import.

INSERT INTO customers (customer_name, mobile_number, email, business_name, gst_number, customer_type, address, status, follow_up_date, notes)
VALUES
('Ramesh Traders', '9876543210', 'ramesh@example.com', 'Ramesh Traders Pvt Ltd', '09ABCDE1234F1Z5', 'Wholesale', 'MG Road, Gorakhpur, UP', 'Active', CURRENT_DATE + INTERVAL '7 day', 'Regular bulk buyer, prefers monthly billing'),
('Sunrise Distributors', '9123456780', 'sunrise@example.com', 'Sunrise Distribution Co', NULL, 'Distributor', 'Sector 5, Noida, UP', 'Lead', CURRENT_DATE + INTERVAL '3 day', 'Interested in electronics category'),
('Anita Retail Store', '9988776655', 'anita@example.com', 'Anita General Store', NULL, 'Retail', 'Civil Lines, Gorakhpur, UP', 'Active', NULL, 'Small retail shop, cash payments only');

INSERT INTO products (product_name, sku, category, unit_price, current_stock, min_stock_alert, location)
VALUES
('LED Bulb 9W', 'LED-9W-001', 'Electricals', 85.00, 500, 50, 'Warehouse A - Rack 1'),
('Ceiling Fan 48in', 'FAN-48-002', 'Electricals', 1450.00, 60, 10, 'Warehouse A - Rack 5'),
('Copper Wire 1.5mm (100m)', 'WIRE-1.5-003', 'Wiring', 2200.00, 25, 5, 'Warehouse B - Rack 2'),
('MCB Switch 32A', 'MCB-32-004', 'Switchgear', 320.00, 8, 10, 'Warehouse B - Rack 3');
