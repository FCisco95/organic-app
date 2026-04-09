/* eslint-disable */
const { Client } = require('pg');

const password = process.env.SUPABASE_DB_PASSWORD;
if (!password) {
  console.error('Set SUPABASE_DB_PASSWORD');
  process.exit(1);
}

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
  const sql = process.argv[2];
  const res = await client.query(sql);
  console.log(JSON.stringify(res.rows, null, 2));
  console.log(`[${res.rowCount} rows]`);
  await client.end();
}
main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
