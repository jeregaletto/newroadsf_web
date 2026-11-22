// Ejecuta backend/schema.sql contra el MySQL configurado en .env
// Uso: npm run db:init     (ATENCIÓN: recrea la base newroad_db y genera un historial de ventas de demo)
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { seedVentas } from './seed-ventas.js';

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

  // Historial de ventas para que las métricas del panel tengan datos
  await conn.query('USE newroad_db');
  const r = await seedVentas(conn);
  console.log(`✔ Historial de ventas generado: ${r.pedidos} pedidos (${r.items} ítems) de los últimos 90 días`);
} catch (err) {
  console.error('✖ Error inicializando la base:', err.code ?? '', err.message);
  process.exitCode = 1;
} finally {
  await conn?.end();
}
