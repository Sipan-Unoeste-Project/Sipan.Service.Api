import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, '..', 'database', 'migrations');

async function ensureMigrationsTable(conn) {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name VARCHAR(255) NOT NULL PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB
  `);
}

async function getApplied(conn) {
  const [rows] = await conn.query('SELECT name FROM schema_migrations');
  return new Set(rows.map((r) => r.name));
}

async function main() {
  const host = process.env.DB_HOST ?? 'localhost';
  const port = Number(process.env.DB_PORT ?? 3307);
  const user = process.env.DB_USER ?? 'sipan';
  const password = process.env.DB_PASSWORD ?? 'sipan_dev_2026';
  const database = process.env.DB_NAME ?? 'sipan';

  console.log(`Conectando em ${host}:${port}/${database}...`);

  const conn = await mysql.createConnection({
    host,
    port,
    user,
    password,
    database,
    multipleStatements: true,
  });

  try {
    await ensureMigrationsTable(conn);
    const applied = await getApplied(conn);

    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.log('Nenhum arquivo em database/migrations/.');
      return;
    }

    let count = 0;
    for (const file of files) {
      if (applied.has(file)) {
        console.log(`  skip  ${file}`);
        continue;
      }

      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      console.log(`  apply ${file}...`);

      await conn.query(sql);
      await conn.query('INSERT INTO schema_migrations (name) VALUES (?)', [file]);
      console.log(`  ok    ${file}`);
      count++;
    }

    if (count === 0) {
      console.log('Banco já está atualizado (nenhuma migração pendente).');
    } else {
      console.log(`${count} migração(ões) aplicada(s). Reinicie a API se ela já estiver rodando.`);
    }
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error('\nErro ao migrar:', err.message);
  if (err.code === 'ECONNREFUSED') {
    console.error(
      'MySQL inacessível. Suba o banco: cd ../Sipan.Service.Web && docker compose up -d'
    );
  }
  process.exit(1);
});
