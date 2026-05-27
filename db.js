import mysql from 'mysql2/promise';

export function createPool() {
  const host = process.env.DB_HOST ?? 'localhost';
  const port = Number(process.env.DB_PORT ?? 3307);
  const user = process.env.DB_USER ?? 'sipan';
  const password = process.env.DB_PASSWORD ?? 'sipan_dev_2026';
  const database = process.env.DB_NAME ?? 'sipan';

  return mysql.createPool({
    host,
    port,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    namedPlaceholders: false,
  });
}
