import { Router } from 'express';
import { pool, withTransaction } from '../db.js';
import { TALLES, TIPOS_ENTREGA, MEDIOS_PAGO, ESTADOS_PEDIDO, HttpError } from '../constants.js';
import { requireAdmin } from '../auth.js';

const router = Router();

async function attachItems(pedidos, conn = pool) {
  if (pedidos.length === 0) return pedidos;
  const [items] = await conn.query(
    `SELECT id, pedido_id, producto_id, nombre_producto, talle, cantidad, precio_unitario, subtotal
       FROM pedido_items WHERE pedido_id IN (?) ORDER BY id`,
    [pedidos.map((p) => p.id)],
  );
  return pedidos.map((p) => ({ ...p, items: items.filter((i) => i.pedido_id === p.id) }));
}

function validarPedido(body) {
  const { cliente_nombre, localidad, tipo_entrega, medio_pago, items } = body ?? {};

  if (!cliente_nombre?.trim()) throw new HttpError(400, 'El nombre es obligatorio');
  if (!localidad?.trim()) throw new HttpError(400, 'La ciudad / provincia es obligatoria');
  if (!TIPOS_ENTREGA.includes(tipo_entrega)) throw new HttpError(400, 'Tipo de entrega inválido');
  if (!MEDIOS_PAGO.includes(medio_pago)) throw new HttpError(400, 'Medio de pago inválido');
  if (!Array.isArray(items) || items.length === 0) throw new HttpError(400, 'El pedido no tiene productos');

  // Normaliza y agrupa ítems repetidos (mismo producto + talle)
  const agrupados = new Map();
  for (const it of items) {
    const producto_id = Number(it.producto_id);
    const cantidad = Number(it.cantidad);
    if (!Number.isInteger(producto_id) || producto_id <= 0) throw new HttpError(400, 'Producto inválido en el pedido');
    if (!TALLES.includes(it.talle)) throw new HttpError(400, `Talle inválido: ${it.talle}`);
    if (!Number.isInteger(cantidad) || cantidad <= 0 || cantidad > 50) throw new HttpError(400, 'Cantidad inválida');
    const key = `${producto_id}-${it.talle}`;
    const prev = agrupados.get(key);
    agrupados.set(key, { producto_id, talle: it.talle, cantidad: (prev?.cantidad ?? 0) + cantidad });
  }

  // Orden estable para tomar los locks siempre en el mismo orden (evita deadlocks)
  const itemsOk = [...agrupados.values()].sort(
    (a, b) => a.producto_id - b.producto_id || a.talle.localeCompare(b.talle),
  );

  return {
    cliente_nombre: cliente_nombre.trim().slice(0, 120),
    localidad: localidad.trim().slice(0, 160),
    tipo_entrega,
    medio_pago,
    items: itemsOk,
  };
}

// ---------------------------------------------------------------------
//  GET /api/pedidos   (panel admin)
// ---------------------------------------------------------------------
router.get('/', requireAdmin, async (_req, res) => {
  const [pedidos] = await pool.query('SELECT * FROM pedidos ORDER BY created_at DESC, id DESC LIMIT 200');
  res.json(await attachItems(pedidos));
});

// GET /api/pedidos/:id
router.get('/:id', requireAdmin, async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM pedidos WHERE id = ?', [Number(req.params.id)]);
  if (rows.length === 0) throw new HttpError(404, 'Pedido no encontrado');
  const [pedido] = await attachItems(rows);
  res.json(pedido);
});

// ---------------------------------------------------------------------
//  POST /api/pedidos
//  Valida stock, toma precios desde la base (no del cliente),
//  guarda pedido + ítems y descuenta stock, todo en una transacción.
// ---------------------------------------------------------------------
router.post('/', async (req, res) => {
  const pedido = validarPedido(req.body);

  const creado = await withTransaction(async (conn) => {
    const lineas = [];
    const faltantes = [];

    for (const it of pedido.items) {
      const [rows] = await conn.query(
        `SELECT p.id, p.nombre, p.precio, p.activo, t.stock
           FROM productos p
           JOIN producto_talles t ON t.producto_id = p.id AND t.talle = ?
          WHERE p.id = ?
          FOR UPDATE`,
        [it.talle, it.producto_id],
      );
      const row = rows[0];
      if (!row || !row.activo) {
        faltantes.push({ producto_id: it.producto_id, talle: it.talle, disponible: 0, motivo: 'no disponible' });
        continue;
      }
      if (row.stock < it.cantidad) {
        faltantes.push({ producto_id: it.producto_id, nombre: row.nombre, talle: it.talle, disponible: row.stock });
        continue;
      }
      lineas.push({
        ...it,
        nombre: row.nombre,
        precio_unitario: row.precio,
        subtotal: Math.round(row.precio * it.cantidad * 100) / 100,
      });
    }

    if (faltantes.length) {
      const detalle = faltantes
        .map((f) => `${f.nombre ?? `Producto #${f.producto_id}`} (talle ${f.talle}): quedan ${f.disponible}`)
        .join(' · ');
      throw new HttpError(409, `Sin stock suficiente — ${detalle}`, faltantes);
    }

    const total = lineas.reduce((acc, l) => acc + l.subtotal, 0);

    const [result] = await conn.query(
      `INSERT INTO pedidos (cliente_nombre, localidad, tipo_entrega, medio_pago, total)
       VALUES (?, ?, ?, ?, ?)`,
      [pedido.cliente_nombre, pedido.localidad, pedido.tipo_entrega, pedido.medio_pago, total],
    );
    const pedidoId = result.insertId;

    await conn.query(
      `INSERT INTO pedido_items
         (pedido_id, producto_id, nombre_producto, talle, cantidad, precio_unitario, subtotal)
       VALUES ?`,
      [lineas.map((l) => [pedidoId, l.producto_id, l.nombre, l.talle, l.cantidad, l.precio_unitario, l.subtotal])],
    );

    for (const l of lineas) {
      await conn.query(
        'UPDATE producto_talles SET stock = stock - ? WHERE producto_id = ? AND talle = ?',
        [l.cantidad, l.producto_id, l.talle],
      );
    }

    const [rows] = await conn.query('SELECT * FROM pedidos WHERE id = ?', [pedidoId]);
    const [conItems] = await attachItems(rows, conn);
    return conItems;
  });

  res.status(201).json(creado);
});

// ---------------------------------------------------------------------
//  PATCH /api/pedidos/:id/estado   body: { estado }
//  Si se cancela, el stock vuelve a estar disponible.
// ---------------------------------------------------------------------
router.patch('/:id/estado', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { estado } = req.body ?? {};
  if (!ESTADOS_PEDIDO.includes(estado)) throw new HttpError(400, 'Estado inválido');

  const actualizado = await withTransaction(async (conn) => {
    const [rows] = await conn.query('SELECT * FROM pedidos WHERE id = ? FOR UPDATE', [id]);
    const actual = rows[0];
    if (!actual) throw new HttpError(404, 'Pedido no encontrado');
    if (actual.estado === 'cancelado' && estado !== 'cancelado') {
      throw new HttpError(409, 'Un pedido cancelado no se puede reactivar. Generá uno nuevo.');
    }

    if (estado === 'cancelado' && actual.estado !== 'cancelado') {
      const [items] = await conn.query(
        'SELECT producto_id, talle, cantidad FROM pedido_items WHERE pedido_id = ? AND producto_id IS NOT NULL',
        [id],
      );
      for (const it of items) {
        await conn.query(
          'UPDATE producto_talles SET stock = stock + ? WHERE producto_id = ? AND talle = ?',
          [it.cantidad, it.producto_id, it.talle],
        );
      }
    }

    await conn.query('UPDATE pedidos SET estado = ? WHERE id = ?', [estado, id]);
    const [nuevo] = await conn.query('SELECT * FROM pedidos WHERE id = ?', [id]);
    const [conItems] = await attachItems(nuevo, conn);
    return conItems;
  });

  res.json(actualizado);
});

export default router;
