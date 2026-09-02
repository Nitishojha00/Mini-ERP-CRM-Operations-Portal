import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();
console.log('DATABASE_URL:', process.env.DATABASE_URL);

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.DATABASE_URL?.includes('localhost') ||
    process.env.DATABASE_URL?.includes('@db:')
      ? false
      : { rejectUnauthorized: false }, // required by most free hosted PG providers (Neon/Supabase/Render)
});

pool.on('error', (err) => {
  // eslint-disable-next-line no-console
  console.error('Unexpected PG pool error', err);
});

export default pool;
