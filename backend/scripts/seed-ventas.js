// Genera un historial de ventas realista (últimos 90 días) para la demo.
// - Determinístico (misma semilla => mismos datos), así la demo es reproducible.
// - Respeta popularidad por producto y talle, más pedidos los sábados y una leve tendencia de crecimiento.
// - NO modifica el stock: son ventas históricas; el stock del seed es el "actual".
// Se ejecuta automáticamente desde init-db.js.

const DIAS = 90;

/** PRNG determinístico (mulberry32) */
function crearRandom(semilla) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Popularidad relativa por id de producto (ver schema.sql)
const POPULARIDAD = { 1: 14, 2: 10, 3: 9, 4: 5, 5: 12, 6: 6, 7: 7, 8: 11, 9: 6, 10: 3, 11: 4, 12: 3, 13: 9, 14: 3 };
const PESO_TALLE = { S: 15, M: 32, L: 30, XL: 16, XXL: 7, U: 1 };

const NOMBRES = ['Lucía', 'Mateo', 'Valentina', 'Juan', 'Martina', 'Santiago', 'Camila', 'Tomás', 'Sofía', 'Benjamín',
  'Julieta', 'Facundo', 'Agustina', 'Lautaro', 'Milagros', 'Franco', 'Abril', 'Nicolás', 'Florencia', 'Joaquín',
  'Micaela', 'Ignacio', 'Rocío', 'Bruno', 'Candela', 'Thiago', 'Paula', 'Gonzalo', 'Antonella', 'Ezequiel'];
const APELLIDOS = ['Fernández', 'González', 'Rodríguez', 'López', 'Martínez', 'Pérez', 'Gómez', 'Díaz', 'Romero', 'Sosa',
  'Álvarez', 'Torres', 'Ruiz', 'Ramírez', 'Benítez', 'Acosta', 'Medina', 'Herrera', 'Aguirre', 'Giménez'];
const LOCALIDADES = [
  ['Santa Fe Capital, Santa Fe', 38], ['Santo Tomé, Santa Fe', 9], ['Paraná, Entre Ríos', 9], ['Rosario, Santa Fe', 8],
  ['Esperanza, Santa Fe', 5], ['Rafaela, Santa Fe', 5], ['Córdoba, Córdoba', 6], ['CABA, Buenos Aires', 6],
  ['Reconquista, Santa Fe', 3], ['Mendoza, Mendoza', 3], ['Salta, Salta', 2], ['Corrientes, Corrientes', 3],
  ['Neuquén, Neuquén', 2], ['Tucumán, Tucumán', 1],
];

function elegirPonderado(rnd, pares) {
  const total = pares.reduce((a, [, w]) => a + w, 0);
  let r = rnd() * total;
  for (const [valor, peso] of pares) {
    r -= peso;
    if (r <= 0) return valor;
  }
  return pares.at(-1)[0];
}

const fmt = (d) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

/**
 * Inserta el historial usando una conexión mysql2/promise ya abierta (con la base seleccionada).
 * @returns {{ pedidos: number, items: number }}
 */
export async function seedVentas(conn, { semilla = 2026 } = {}) {
  const rnd = crearRandom(semilla);

  const [productos] = await conn.query('SELECT id, nombre, precio FROM productos');
  const [talles] = await conn.query('SELECT producto_id, talle FROM producto_talles');
  const tallesPorProducto = new Map(productos.map((p) => [p.id, []]));
  for (const t of talles) tallesPorProducto.get(t.producto_id)?.push(t.talle);

  const candidatos = productos.map((p) => [p, POPULARIDAD[p.id] ?? 4]);
  const ahora = new Date();
  const pedidos = [];

  for (let diasAtras = DIAS - 1; diasAtras >= 0; diasAtras--) {
    const dia = new Date(ahora);
    dia.setDate(dia.getDate() - diasAtras);
    const semana = dia.getDay(); // 0 domingo, 6 sábado

    // Base 3/día, más los sábados, menos los domingos (local cerrado, solo web) y crecimiento suave
    const tendencia = 1 + 0.35 * ((DIAS - diasAtras) / DIAS);
    const factorDia = semana === 6 ? 1.7 : semana === 0 ? 0.45 : semana === 5 ? 1.25 : 1;
    const esperados = 3 * tendencia * factorDia;
    const cantidad = Math.max(0, Math.round(esperados + (rnd() - 0.5) * 3));

    for (let i = 0; i < cantidad; i++) {
      const fecha = new Date(dia);
      fecha.setHours(9 + Math.floor(rnd() * 12), Math.floor(rnd() * 60), Math.floor(rnd() * 60), 0);
      if (fecha > ahora) continue; // hoy: solo pedidos hasta la hora actual

      const localidad = elegirPonderado(rnd, LOCALIDADES);
      const esLocal = localidad.startsWith('Santa Fe Capital') || localidad.startsWith('Santo Tomé');
      const tipoEntrega = esLocal && rnd() < 0.7 ? 'retiro' : 'envio';
      const medioPago = elegirPonderado(rnd, [['transferencia', 50], ['efectivo', esLocal ? 30 : 10], ['tarjeta', 25]]);

      // 1 a 3 prendas distintas
      const nItems = elegirPonderado(rnd, [[1, 60], [2, 30], [3, 10]]);
      const items = new Map();
      for (let k = 0; k < nItems; k++) {
        const p = elegirPonderado(rnd, candidatos);
        const disponibles = tallesPorProducto.get(p.id);
        if (!disponibles?.length) continue;
        const talle = elegirPonderado(rnd, disponibles.map((t) => [t, PESO_TALLE[t] ?? 1]));
        const key = `${p.id}-${talle}`;
        const cant = rnd() < 0.88 ? 1 : 2;
        const prev = items.get(key);
        items.set(key, { producto: p, talle, cantidad: (prev?.cantidad ?? 0) + cant });
      }
      if (!items.size) continue;

      // Estado según antigüedad
      let estado;
      if (diasAtras > 7) estado = rnd() < 0.06 ? 'cancelado' : 'entregado';
      else if (diasAtras > 2) estado = elegirPonderado(rnd, [['entregado', 45], ['enviado', 35], ['confirmado', 15], ['cancelado', 5]]);
      else estado = elegirPonderado(rnd, [['pendiente', 55], ['confirmado', 40], ['cancelado', 5]]);

      const lineas = [...items.values()].map((it) => ({ ...it, subtotal: it.producto.precio * it.cantidad }));
      pedidos.push({
        fecha,
        cliente: `${NOMBRES[Math.floor(rnd() * NOMBRES.length)]} ${APELLIDOS[Math.floor(rnd() * APELLIDOS.length)]}`,
        localidad,
        tipoEntrega,
        medioPago,
        estado,
        total: lineas.reduce((a, l) => a + l.subtotal, 0),
        lineas,
      });
    }
  }

  // Orden cronológico => los números de pedido crecen con la fecha
  pedidos.sort((a, b) => a.fecha - b.fecha);

  let nItems = 0;
  for (const p of pedidos) {
    const [r] = await conn.query(
      `INSERT INTO pedidos (cliente_nombre, localidad, tipo_entrega, medio_pago, total, estado, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [p.cliente, p.localidad, p.tipoEntrega, p.medioPago, p.total, p.estado, fmt(p.fecha)],
    );
    await conn.query(
      `INSERT INTO pedido_items (pedido_id, producto_id, nombre_producto, talle, cantidad, precio_unitario, subtotal) VALUES ?`,
      [p.lineas.map((l) => [r.insertId, l.producto.id, l.producto.nombre, l.talle, l.cantidad, l.producto.precio, l.subtotal])],
    );
    nItems += p.lineas.length;
  }
  return { pedidos: pedidos.length, items: nItems };
}
