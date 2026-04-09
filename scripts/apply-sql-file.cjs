/* eslint-disable */
const fs = require('fs');
const { Client } = require('pg');

const password = process.env.SUPABASE_DB_PASSWORD;
if (!password) {
  console.error('Set SUPABASE_DB_PASSWORD');
  process.exit(1);
}

const file = process.argv[2];
if (!file) {
  console.error('Usage: node apply-sql-file.cjs <path/to/file.sql>');
  process.exit(1);
}

const sql = fs.readFileSync(file, 'utf8');

const client = new Client({
  host: 'aws-1-eu-north-1.pooler.supabase.com',
  port: 5432,
  user: 'postgres.dcqfuqjqmqrzycyvutkn',
  password,
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
});

async function main() {
  await client.connect();
  await client.query('BEGIN');
  try {
    await client.query(sql);
    await client.query('COMMIT');
    console.log('Applied:', file);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('FAILED:', e.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}
main();
