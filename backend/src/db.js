import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'newroad_db',
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4',
  // DECIMAL -> number (en vez de string) para precios y totales
  decimalNumbers: true,
});

/**
 * Ejecuta `fn(conn)` dentro de una transacción.
 * Hace COMMIT si todo sale bien y ROLLBACK ante cualquier error.
 */
export async function withTransaction(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
