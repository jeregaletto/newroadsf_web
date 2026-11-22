import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool } from './db.js';
import productosRouter from './routes/productos.js';
import pedidosRouter from './routes/pedidos.js';
import chatRouter from './routes/chat.js';
import authRouter from './routes/auth.js';
import metricasRouter from './routes/metricas.js';
import adminIARouter from './routes/adminIA.js';

dotenv.config({ quiet: true });

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Healthcheck: confirma que la API y MySQL responden
app.get('/api/health', async (_req, res) => {
  const [[row]] = await pool.query('SELECT 1 AS ok');
  res.json({ api: 'ok', db: row.ok === 1 ? 'ok' : 'error' });
});

app.use('/api/productos', productosRouter);
app.use('/api/pedidos', pedidosRouter);
app.use('/api/chat', chatRouter);
app.use('/api/auth', authRouter);
app.use('/api/metricas', metricasRouter);
app.use('/api/admin/ia', adminIARouter);

app.use('/api', (_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

// Manejo centralizado de errores (Express 5 captura los errores async)
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON inválido' });
  }
  const status = err.status ?? 500;
  if (status >= 500) console.error('[API]', err);
  res.status(status).json({
    error: status >= 500 ? 'Error interno del servidor' : err.message,
    ...(err.details ? { details: err.details } : {}),
  });
});

async function start() {
  try {
    await pool.query('SELECT 1');
    console.log(`✔ Conectado a MySQL (${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME})`);
  } catch (err) {
    console.error('✖ No se pudo conectar a MySQL:', err.code ?? '', err.message);
    console.error('  Revisá que el servicio MySQL esté corriendo y los datos de backend/.env');
    process.exit(1);
  }
  app.listen(PORT, () => {
    console.log(`✔ API New Road escuchando en http://localhost:${PORT}/api`);
  });
}

start();
