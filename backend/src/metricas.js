// Métricas de ventas y stock. Lo usan el endpoint /api/metricas (gráficos del panel)
// y las herramientas del asistente del admin, así los números siempre coinciden.
import { pool } from './db.js';
import { CATEGORIAS, TALLES } from './constants.js';

const NO_CANCELADO = "pe.estado <> 'cancelado'";
const ORDEN_TALLES = (col) => `FIELD(${col}, ${TALLES.map((t) => `'${t}'`).join(',')})`;

/** Ventana usada para medir la velocidad de venta en las alertas de stock (estable, no depende del filtro). */
export const DIAS_VELOCIDAD = 30;

// Umbrales de alerta: días de stock que quedan al ritmo de venta actual
const COBERTURA_CRITICA = 10;
const COBERTURA_BAJA = 21;
// Reposición sugerida: lo necesario para cubrir este horizonte
const DIAS_OBJETIVO = 30;

export function normalizarDias(valor, porDefecto = 30) {
  const n = Math.round(Number(valor));
  return Number.isFinite(n) && n >= 1 ? Math.min(n, 365) : porDefecto;
}

/** Condición SQL "en los últimos N días" (incluye hoy). desde = 0 → período actual; 1 → período anterior. */
function rango(dias, periodo = 0) {
  const inicio = dias * (periodo + 1) - 1;
  const fin = dias * periodo - 1;
  return {
    sql:
      periodo === 0
        ? 'pe.created_at >= CURDATE() - INTERVAL ? DAY'
        : 'pe.created_at >= CURDATE() - INTERVAL ? DAY AND pe.created_at < CURDATE() - INTERVAL ? DAY',
    params: periodo === 0 ? [inicio] : [inicio, fin],
  };
}

const redondear = (n, d = 0) => Math.round(Number(n) * 10 ** d) / 10 ** d;

// ---------------------------------------------------------------------
//  Ventas
// ---------------------------------------------------------------------
async function totales(dias, periodo) {
  const r = rango(dias, periodo);
  const [[fila]] = await pool.query(
    `SELECT COUNT(*) AS pedidos, COALESCE(SUM(pe.total), 0) AS ventas,
            COALESCE((SELECT SUM(pi.cantidad) FROM pedido_items pi JOIN pedidos pe ON pe.id = pi.pedido_id
                      WHERE ${NO_CANCELADO} AND ${r.sql}), 0) AS unidades
       FROM pedidos pe WHERE ${NO_CANCELADO} AND ${r.sql}`,
    [...r.params, ...r.params],
  );
  const pedidos = Number(fila.pedidos);
  const ventas = Number(fila.ventas);
  return { ventas, pedidos, unidades: Number(fila.unidades), ticket_promedio: pedidos ? redondear(ventas / pedidos) : 0 };
}

const variacion = (actual, anterior) => (anterior ? redondear(((actual - anterior) / anterior) * 100, 1) : null);

export async function resumen(dias) {
  const [actual, anterior] = await Promise.all([totales(dias, 0), totales(dias, 1)]);
  const r = rango(dias);
  const [porEstado] = await pool.query(
    `SELECT pe.estado, COUNT(*) AS pedidos, SUM(pe.total) AS total FROM pedidos pe WHERE ${r.sql} GROUP BY pe.estado`,
    r.params,
  );
  const [[{ pendientes }]] = await pool.query("SELECT COUNT(*) AS pendientes FROM pedidos WHERE estado = 'pendiente'");
  return {
    dias,
    ...actual,
    anterior,
    variacion_pct: {
      ventas: variacion(actual.ventas, anterior.ventas),
      pedidos: variacion(actual.pedidos, anterior.pedidos),
      ticket_promedio: variacion(actual.ticket_promedio, anterior.ticket_promedio),
      unidades: variacion(actual.unidades, anterior.unidades),
    },
    por_estado: porEstado.map((e) => ({ estado: e.estado, pedidos: Number(e.pedidos), total: Number(e.total) })),
    pendientes_a_confirmar: Number(pendientes),
  };
}

/** Serie diaria completa (los días sin ventas aparecen con 0). */
export async function ventasPorDia(dias) {
  const r = rango(dias);
  const [rows] = await pool.query(
    `SELECT DATE_FORMAT(pe.created_at, '%Y-%m-%d') AS fecha, SUM(pe.total) AS ventas, COUNT(*) AS pedidos
       FROM pedidos pe WHERE ${NO_CANCELADO} AND ${r.sql} GROUP BY fecha`,
    r.params,
  );
  const porFecha = new Map(rows.map((x) => [x.fecha, x]));
  const serie = [];
  const hoy = new Date();
  for (let i = dias - 1; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - i);
    const fecha = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const x = porFecha.get(fecha);
    serie.push({ fecha, ventas: Number(x?.ventas ?? 0), pedidos: Number(x?.pedidos ?? 0) });
  }
  return serie;
}

export async function productosMasVendidos(dias, { limite = 8, categoria } = {}) {
  const r = rango(dias);
  const params = [...r.params];
  let filtroCat = '';
  if (categoria && CATEGORIAS.includes(categoria)) {
    filtroCat = 'AND p.categoria = ?';
    params.push(categoria);
  }
  const [rows] = await pool.query(
    `SELECT pi.producto_id, MAX(pi.nombre_producto) AS nombre, MAX(p.categoria) AS categoria,
            SUM(pi.cantidad) AS unidades, SUM(pi.subtotal) AS ingresos
       FROM pedido_items pi
       JOIN pedidos pe ON pe.id = pi.pedido_id
       LEFT JOIN productos p ON p.id = pi.producto_id
      WHERE ${NO_CANCELADO} AND ${r.sql} ${filtroCat}
      GROUP BY pi.producto_id
      ORDER BY unidades DESC, ingresos DESC
      LIMIT ${Math.min(Math.max(Number(limite) || 8, 1), 20)}`,
    params,
  );
  return rows.map((x) => ({
    producto_id: x.producto_id,
    nombre: x.nombre,
    categoria: x.categoria,
    unidades: Number(x.unidades),
    ingresos: Number(x.ingresos),
  }));
}

export async function ventasPorCategoria(dias) {
  const r = rango(dias);
  const [rows] = await pool.query(
    `SELECT COALESCE(p.categoria, 'Sin categoría') AS categoria, SUM(pi.cantidad) AS unidades, SUM(pi.subtotal) AS ingresos
       FROM pedido_items pi JOIN pedidos pe ON pe.id = pi.pedido_id LEFT JOIN productos p ON p.id = pi.producto_id
      WHERE ${NO_CANCELADO} AND ${r.sql}
      GROUP BY categoria ORDER BY ingresos DESC`,
    r.params,
  );
  return rows.map((x) => ({ categoria: x.categoria, unidades: Number(x.unidades), ingresos: Number(x.ingresos) }));
}

export async function ventasPorTalle(dias) {
  const r = rango(dias);
  const [rows] = await pool.query(
    `SELECT pi.talle, SUM(pi.cantidad) AS unidades
       FROM pedido_items pi JOIN pedidos pe ON pe.id = pi.pedido_id
      WHERE ${NO_CANCELADO} AND ${r.sql}
      GROUP BY pi.talle ORDER BY ${ORDEN_TALLES('pi.talle')}`,
    r.params,
  );
  return rows.map((x) => ({ talle: x.talle, unidades: Number(x.unidades) }));
}

async function distribucion(columna, dias) {
  const r = rango(dias);
  const [rows] = await pool.query(
    `SELECT pe.${columna} AS valor, COUNT(*) AS pedidos, SUM(pe.total) AS total
       FROM pedidos pe WHERE ${NO_CANCELADO} AND ${r.sql} GROUP BY pe.${columna} ORDER BY pedidos DESC`,
    r.params,
  );
  return rows.map((x) => ({ valor: x.valor, pedidos: Number(x.pedidos), total: Number(x.total) }));
}
export const mediosDePago = (dias) => distribucion('medio_pago', dias);
export const tiposDeEntrega = (dias) => distribucion('tipo_entrega', dias);

// ---------------------------------------------------------------------
//  Stock
// ---------------------------------------------------------------------
export async function inventario() {
  const [[tot]] = await pool.query(
    `SELECT COALESCE(SUM(t.stock), 0) AS unidades, COALESCE(SUM(t.stock * p.precio), 0) AS valor,
            SUM(t.stock = 0) AS talles_agotados, COUNT(*) AS talles_total
       FROM producto_talles t JOIN productos p ON p.id = t.producto_id WHERE p.activo = 1`,
  );
  const [porCategoria] = await pool.query(
    `SELECT p.categoria, SUM(t.stock) AS unidades, SUM(t.stock * p.precio) AS valor
       FROM producto_talles t JOIN productos p ON p.id = t.producto_id
      WHERE p.activo = 1 GROUP BY p.categoria ORDER BY unidades DESC`,
  );
  return {
    unidades: Number(tot.unidades),
    valor_a_precio_venta: Number(tot.valor),
    talles_agotados: Number(tot.talles_agotados),
    talles_total: Number(tot.talles_total),
    por_categoria: porCategoria.map((x) => ({ categoria: x.categoria, unidades: Number(x.unidades), valor: Number(x.valor) })),
  };
}

/**
 * Alertas de reposición por producto y talle, según la velocidad de venta de los últimos 30 días.
 * nivel: agotado | critico (≤ 10 días de stock al ritmo actual) | bajo (≤ 21 días)
 */
export async function alertasStock() {
  const [rows] = await pool.query(
    `SELECT p.id AS producto_id, p.nombre, p.categoria, t.talle, t.stock,
            COALESCE(v.vendidas, 0) AS vendidas
       FROM producto_talles t
       JOIN productos p ON p.id = t.producto_id AND p.activo = 1
       LEFT JOIN (
         SELECT pi.producto_id, pi.talle, SUM(pi.cantidad) AS vendidas
           FROM pedido_items pi JOIN pedidos pe ON pe.id = pi.pedido_id
          WHERE ${NO_CANCELADO} AND pe.created_at >= CURDATE() - INTERVAL ? DAY
          GROUP BY pi.producto_id, pi.talle
       ) v ON v.producto_id = t.producto_id AND v.talle = t.talle`,
    [DIAS_VELOCIDAD - 1],
  );

  const alertas = [];
  for (const x of rows) {
    const vendidas = Number(x.vendidas);
    const porDia = vendidas / DIAS_VELOCIDAD;
    const cobertura = porDia > 0 ? redondear(x.stock / porDia) : null;
    let nivel = null;
    if (x.stock === 0) nivel = 'agotado';
    else if (cobertura !== null && cobertura <= COBERTURA_CRITICA) nivel = 'critico';
    // Sin ventas recientes, poco stock no es urgente: solo se alerta por cobertura
    else if (cobertura !== null && cobertura <= COBERTURA_BAJA) nivel = 'bajo';
    if (!nivel) continue;
    // Si no se vende, un agotado no es urgente: se sugiere reponer poco
    const reponer = Math.max(0, Math.ceil(porDia * DIAS_OBJETIVO) - x.stock) || (x.stock === 0 ? 2 : 0);
    alertas.push({
      producto_id: x.producto_id,
      nombre: x.nombre,
      categoria: x.categoria,
      talle: x.talle,
      stock: x.stock,
      vendidas_30d: vendidas,
      cobertura_dias: cobertura,
      nivel,
      reponer_sugerido: reponer,
    });
  }
  const orden = { agotado: 0, critico: 1, bajo: 2 };
  alertas.sort((a, b) => orden[a.nivel] - orden[b.nivel] || b.vendidas_30d - a.vendidas_30d || a.stock - b.stock);
  return alertas;
}

/** Productos con stock que no se vendieron en el período (mercadería inmovilizada). */
export async function sinMovimiento(dias) {
  const r = rango(dias);
  const [rows] = await pool.query(
    `SELECT p.id AS producto_id, p.nombre, p.categoria, p.precio, SUM(t.stock) AS stock
       FROM productos p JOIN producto_talles t ON t.producto_id = p.id
      WHERE p.activo = 1
        AND NOT EXISTS (SELECT 1 FROM pedido_items pi JOIN pedidos pe ON pe.id = pi.pedido_id
                         WHERE pi.producto_id = p.id AND ${NO_CANCELADO} AND ${r.sql})
      GROUP BY p.id HAVING SUM(t.stock) > 0 ORDER BY SUM(t.stock) * p.precio DESC`,
    r.params,
  );
  return rows.map((x) => ({
    producto_id: x.producto_id,
    nombre: x.nombre,
    categoria: x.categoria,
    stock: Number(x.stock),
    valor: Number(x.stock) * Number(x.precio),
  }));
}

/** Todo junto para el tablero del panel. */
export async function tablero(dias) {
  const [res, serie, top, categorias, talles, pagos, entregas, inv, alertas, quietos] = await Promise.all([
    resumen(dias),
    ventasPorDia(dias),
    productosMasVendidos(dias, { limite: 8 }),
    ventasPorCategoria(dias),
    ventasPorTalle(dias),
    mediosDePago(dias),
    tiposDeEntrega(dias),
    inventario(),
    alertasStock(),
    sinMovimiento(dias),
  ]);
  return {
    dias,
    resumen: res,
    ventas_por_dia: serie,
    mas_vendidos: top,
    por_categoria: categorias,
    por_talle: talles,
    medios_pago: pagos,
    tipos_entrega: entregas,
    stock: { ...inv, alertas, sin_movimiento: quietos, dias_velocidad: DIAS_VELOCIDAD },
  };
}
