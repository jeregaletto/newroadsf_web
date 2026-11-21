import { Router } from 'express';
import { pool, withTransaction } from '../db.js';
import { CATEGORIAS, TALLES, HttpError } from '../constants.js';
import { requireAdmin, esAdmin } from '../auth.js';

const router = Router();

const ORDEN_TALLES = `FIELD(talle, ${TALLES.map((t) => `'${t}'`).join(',')})`;

// ---------------------------------------------------------------------
//  Helpers
// ---------------------------------------------------------------------
function parseId(raw) {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, 'ID de producto inválido');
  return id;
}

/** Adjunta a cada producto su array de talles + stock total. */
async function attachTalles(productos, conn = pool) {
  if (productos.length === 0) return productos;
  const ids = productos.map((p) => p.id);
  const [rows] = await conn.query(
    `SELECT producto_id, talle, stock
       FROM producto_talles
      WHERE producto_id IN (?)
      ORDER BY producto_id, ${ORDEN_TALLES}`,
    [ids],
  );
  const porProducto = new Map(ids.map((id) => [id, []]));
  for (const r of rows) porProducto.get(r.producto_id).push({ talle: r.talle, stock: r.stock });

  return productos.map((p) => {
    const talles = porProducto.get(p.id);
    return {
      ...p,
      destacado: Boolean(p.destacado),
      activo: Boolean(p.activo),
      talles,
      stock_total: talles.reduce((acc, t) => acc + t.stock, 0),
    };
  });
}

async function getProducto(id, conn = pool) {
  const [rows] = await conn.query('SELECT * FROM productos WHERE id = ?', [id]);
  if (rows.length === 0) throw new HttpError(404, 'Producto no encontrado');
  const [producto] = await attachTalles(rows, conn);
  return producto;
}

function validarTalles(talles) {
  if (!Array.isArray(talles)) throw new HttpError(400, '`talles` debe ser un array');
  const vistos = new Set();
  return talles.map(({ talle, stock }) => {
    if (!TALLES.includes(talle)) throw new HttpError(400, `Talle inválido: ${talle}`);
    if (vistos.has(talle)) throw new HttpError(400, `Talle repetido: ${talle}`);
    vistos.add(talle);
    const n = Number(stock);
    if (!Number.isInteger(n) || n < 0) throw new HttpError(400, `Stock inválido para talle ${talle}`);
    return { talle, stock: n };
  });
}

function validarPrecio(precio) {
  const n = Number(precio);
  if (!Number.isFinite(n) || n < 0) throw new HttpError(400, 'El precio debe ser un número mayor o igual a 0');
  return Math.round(n * 100) / 100;
}

async function upsertTalles(conn, productoId, talles) {
  if (talles.length === 0) return;
  await conn.query(
    `INSERT INTO producto_talles (producto_id, talle, stock) VALUES ?
     ON DUPLICATE KEY UPDATE stock = VALUES(stock)`,
    [talles.map((t) => [productoId, t.talle, t.stock])],
  );
}

// ---------------------------------------------------------------------
//  GET /api/productos?q=&categoria=&talle=&todos=1
// ---------------------------------------------------------------------
router.get('/', async (req, res) => {
  const { q, categoria, talle, todos } = req.query;
  const where = [];
  const params = [];

  // Los productos ocultos solo los ve el panel admin
  if (todos === '1' && !esAdmin(req)) throw new HttpError(401, 'Sesión vencida o no iniciada. Ingresá de nuevo.');
  if (todos !== '1') where.push('p.activo = 1');

  if (categoria) {
    if (!CATEGORIAS.includes(categoria)) throw new HttpError(400, `Categoría inválida: ${categoria}`);
    where.push('p.categoria = ?');
    params.push(categoria);
  }

  if (talle) {
    if (!TALLES.includes(talle)) throw new HttpError(400, `Talle inválido: ${talle}`);
    // Solo productos que tengan stock en ese talle
    where.push('EXISTS (SELECT 1 FROM producto_talles t WHERE t.producto_id = p.id AND t.talle = ? AND t.stock > 0)');
    params.push(talle);
  }

  if (q && q.trim()) {
    where.push('(p.nombre LIKE ? OR p.descripcion LIKE ? OR p.categoria LIKE ?)');
    const like = `%${q.trim()}%`;
    params.push(like, like, like);
  }

  const sql = `
    SELECT p.* FROM productos p
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY p.destacado DESC, FIELD(p.categoria, ${CATEGORIAS.map((c) => `'${c}'`).join(',')}), p.id`;

  const [rows] = await pool.query(sql, params);
  res.json(await attachTalles(rows));
});

// GET /api/productos/:id
router.get('/:id', async (req, res) => {
  res.json(await getProducto(parseId(req.params.id)));
});

// ---------------------------------------------------------------------
//  POST /api/productos   (alta desde el panel admin)
// ---------------------------------------------------------------------
router.post('/', requireAdmin, async (req, res) => {
  const { nombre, categoria, descripcion = '', precio, imagen_url, destacado = false, talles = [] } = req.body ?? {};

  if (!nombre?.trim()) throw new HttpError(400, 'El nombre es obligatorio');
  if (!CATEGORIAS.includes(categoria)) throw new HttpError(400, 'Categoría inválida');
  if (!imagen_url?.trim()) throw new HttpError(400, 'La URL de la imagen es obligatoria');
  const precioOk = validarPrecio(precio);
  const tallesOk = validarTalles(talles);

  const producto = await withTransaction(async (conn) => {
    const [result] = await conn.query(
      `INSERT INTO productos (nombre, categoria, descripcion, precio, imagen_url, destacado)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [nombre.trim(), categoria, descripcion.trim(), precioOk, imagen_url.trim(), destacado ? 1 : 0],
    );
    await upsertTalles(conn, result.insertId, tallesOk);
    return getProducto(result.insertId, conn);
  });

  res.status(201).json(producto);
});

// ---------------------------------------------------------------------
//  PATCH /api/productos/:id   (edición parcial: precio, nombre, etc.)
// ---------------------------------------------------------------------
router.patch('/:id', requireAdmin, async (req, res) => {
  const id = parseId(req.params.id);
  const body = req.body ?? {};
  const sets = [];
  const params = [];

  if (body.nombre !== undefined) {
    if (!String(body.nombre).trim()) throw new HttpError(400, 'El nombre no puede quedar vacío');
    sets.push('nombre = ?');
    params.push(String(body.nombre).trim());
  }
  if (body.categoria !== undefined) {
    if (!CATEGORIAS.includes(body.categoria)) throw new HttpError(400, 'Categoría inválida');
    sets.push('categoria = ?');
    params.push(body.categoria);
  }
  if (body.descripcion !== undefined) {
    sets.push('descripcion = ?');
    params.push(String(body.descripcion).trim());
  }
  if (body.precio !== undefined) {
    sets.push('precio = ?');
    params.push(validarPrecio(body.precio));
  }
  if (body.imagen_url !== undefined) {
    if (!String(body.imagen_url).trim()) throw new HttpError(400, 'La URL de la imagen no puede quedar vacía');
    sets.push('imagen_url = ?');
    params.push(String(body.imagen_url).trim());
  }
  if (body.destacado !== undefined) {
    sets.push('destacado = ?');
    params.push(body.destacado ? 1 : 0);
  }
  if (body.activo !== undefined) {
    sets.push('activo = ?');
    params.push(body.activo ? 1 : 0);
  }

  if (sets.length === 0) throw new HttpError(400, 'No se enviaron campos para actualizar');

  const [result] = await pool.query(`UPDATE productos SET ${sets.join(', ')} WHERE id = ?`, [...params, id]);
  if (result.affectedRows === 0) throw new HttpError(404, 'Producto no encontrado');
  res.json(await getProducto(id));
});

// DELETE /api/productos/:id  -> baja lógica (se oculta de la tienda, conserva historial de pedidos)
router.delete('/:id', requireAdmin, async (req, res) => {
  const id = parseId(req.params.id);
  const [result] = await pool.query('UPDATE productos SET activo = 0 WHERE id = ?', [id]);
  if (result.affectedRows === 0) throw new HttpError(404, 'Producto no encontrado');
  res.status(204).end();
});

// ---------------------------------------------------------------------
//  Talles / stock
// ---------------------------------------------------------------------

// GET /api/productos/:id/talles
router.get('/:id/talles', async (req, res) => {
  const producto = await getProducto(parseId(req.params.id));
  res.json(producto.talles);
});

// PUT /api/productos/:id/talles   body: { talles: [{ talle, stock }] }  (upsert)
router.put('/:id/talles', requireAdmin, async (req, res) => {
  const id = parseId(req.params.id);
  const talles = validarTalles(req.body?.talles);
  const producto = await withTransaction(async (conn) => {
    await getProducto(id, conn); // 404 si no existe
    await upsertTalles(conn, id, talles);
    return getProducto(id, conn);
  });
  res.json(producto);
});

export default router;
