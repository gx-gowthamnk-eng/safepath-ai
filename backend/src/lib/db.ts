import { Client } from 'pg';

const DB_URL = process.env.DATABASE_URL;

// Per-request client for serverless compatibility (Pools cause issues on Vercel cold starts)
export const query = async (text: string, params?: any[]): Promise<any> => {
  if (!DB_URL) {
    console.error('FATAL: DATABASE_URL environment variable is not set!');
    throw new Error('Database not configured. Please set DATABASE_URL environment variable.');
  }

  const client = new Client({
    connectionString: DB_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    await client.connect();
    const res = await client.query(text, params);
    return { rows: res.rows, rowCount: res.rowCount };
  } catch (err: any) {
    console.error('PostgreSQL query error:', err.message, '\nQuery:', text);
    throw err;
  } finally {
    await client.end().catch(() => {});
  }
};
