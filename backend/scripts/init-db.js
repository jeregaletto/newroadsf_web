// Ejecuta backend/schema.sql contra el MySQL configurado en .env
// Uso: npm run db:init     (ATENCIÓN: recrea la base newroad_db)
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(root, '.env'), quiet: true });

const sql = await readFile(path.join(root, 'schema.sql'), 'utf8');

let conn;
try {
  conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    charset: 'utf8mb4',
    multipleStatements: true,
  });
  await conn.query(sql);
  const [[{ n }]] = await conn.query('SELECT COUNT(*) AS n FROM newroad_db.productos');
  console.log(`✔ Base newroad_db creada. Productos cargados: ${n}`);
} catch (err) {
  console.error('✖ Error inicializando la base:', err.code ?? '', err.message);
  process.exitCode = 1;
} finally {
  await conn?.end();
}
