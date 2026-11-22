// Herramientas del asistente del PANEL ADMIN. Todas son de solo lectura:
// el asistente analiza ventas y stock, pero no cambia precios, stock ni pedidos.
import { pool } from '../db.js';
import { CATEGORIAS, ESTADOS_PEDIDO } from '../constants.js';
import * as M from '../metricas.js';
import { declaraciones as declaracionesCatalogo, ejecutarHerramienta as ejecutarCatalogo } from './tools.js';

const DIAS = {
  type: 'INTEGER',
  description: 'Cantidad de días hacia atrás, incluyendo hoy (ej: 7 = última semana, 30 = último mes). Por defecto 30.',
};

export const declaraciones = [
  {
    name: 'resumen_ventas',
    description:
      'Totales del período: ventas en pesos, pedidos, unidades, ticket promedio, comparación porcentual con el período anterior de igual duración y pedidos por estado. Excluye cancelados de los totales.',
    parameters: { type: 'OBJECT', properties: { dias: DIAS } },
  },
  {
    name: 'ventas_por_dia',
    description: 'Serie de ventas por día (hasta 31 días) o por semana (períodos más largos). Sirve para "qué día vendí más", tendencias, etc.',
    parameters: { type: 'OBJECT', properties: { dias: DIAS } },
  },
  {
    name: 'productos_mas_vendidos',
    description: 'Ranking de productos por unidades vendidas en el período, con ingresos. Opcionalmente filtrado por categoría.',
    parameters: {
      type: 'OBJECT',
      properties: {
        dias: DIAS,
        limite: { type: 'INTEGER', description: 'Cantidad de productos (1 a 20). Por defecto 8.' },
        categoria: { type: 'STRING', enum: CATEGORIAS },
      },
    },
  },
  {
    name: 'ventas_por_categoria_y_talle',
    description: 'Unidades e ingresos por categoría, y unidades vendidas por talle, en el período.',
    parameters: { type: 'OBJECT', properties: { dias: DIAS } },
  },
  {
    name: 'medios_de_pago_y_entrega',
    description: 'Cantidad de pedidos y montos por medio de pago (efectivo/transferencia/tarjeta) y por tipo de entrega (retiro/envío) en el período.',
    parameters: { type: 'OBJECT', properties: { dias: DIAS } },
  },
  {
    name: 'estado_del_stock',
    description:
      'Inventario actual (unidades y valor a precio de venta, por categoría), alertas de reposición por producto y talle ' +
      '(agotado / crítico / bajo, con ventas de los últimos 30 días, días de cobertura y cantidad sugerida a reponer) ' +
      'y productos sin ventas en los últimos 30 días.',
    parameters: { type: 'OBJECT', properties: {} },
  },
  {
    name: 'buscar_pedidos',
    description: 'Lista pedidos con sus prendas. Filtros opcionales: estado, texto (nombre del cliente, localidad o número de pedido) y días hacia atrás.',
    parameters: {
      type: 'OBJECT',
      properties: {
        estado: { type: 'STRING', enum: ESTADOS_PEDIDO },
        texto: { type: 'STRING', description: 'Nombre del cliente, localidad o número de pedido.' },
        dias: DIAS,
        limite: { type: 'INTEGER', description: 'Máximo de pedidos (1 a 20). Por defecto 10.' },
      },
    },
  },
  // Catálogo con stock actual por talle (mismas herramientas que el asistente de la tienda)
  ...declaracionesCatalogo,
];

async function ventasPorDiaOSemana(dias) {
  const serie = await M.ventasPorDia(dias);
  if (dias <= 31) return { agrupado_por: 'día', serie };
  const semanas = [];
  for (let i = 0; i < serie.length; i += 7) {
    const tramo = serie.slice(i, i + 7);
    semanas.push({
      desde: tramo[0].fecha,
      hasta: tramo.at(-1).fecha,
      ventas: tramo.reduce((a, d) => a + d.ventas, 0),
      pedidos: tramo.reduce((a, d) => a + d.pedidos, 0),
    });
  }
  return { agrupado_por: 'semana', serie: semanas };
}

async function buscarPedidos({ estado, texto, dias, limite } = {}) {
  const where = [];
  const params = [];
  if (estado && ESTADOS_PEDIDO.includes(estado)) {
    where.push('pe.estado = ?');
    params.push(estado);
  }
  if (texto?.trim()) {
    const t = texto.trim().replace(/^#/, '');
    if (/^\d+$/.test(t)) {
      where.push('pe.id = ?');
      params.push(Number(t));
    } else {
      where.push('(pe.cliente_nombre LIKE ? OR pe.localidad LIKE ?)');
      params.push(`%${t}%`, `%${t}%`);
    }
  }
  if (dias) {
    where.push('pe.created_at >= CURDATE() - INTERVAL ? DAY');
    params.push(M.normalizarDias(dias) - 1);
  }
  const tope = Math.min(Math.max(Number(limite) || 10, 1), 20);
  const [pedidos] = await pool.query(
    `SELECT pe.id, DATE_FORMAT(pe.created_at, '%Y-%m-%d %H:%i') AS fecha, pe.cliente_nombre AS cliente, pe.localidad,
            pe.tipo_entrega, pe.medio_pago, pe.total, pe.estado
       FROM pedidos pe ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY pe.created_at DESC LIMIT ${tope}`,
    params,
  );
  if (!pedidos.length) return { cantidad: 0, pedidos: [] };
  const [items] = await pool.query(
    'SELECT pedido_id, nombre_producto, talle, cantidad FROM pedido_items WHERE pedido_id IN (?)',
    [pedidos.map((p) => p.id)],
  );
  return {
    cantidad: pedidos.length,
    pedidos: pedidos.map((p) => ({
      ...p,
      total: Number(p.total),
      prendas: items.filter((i) => i.pedido_id === p.id).map((i) => `${i.cantidad}x ${i.nombre_producto} (${i.talle === 'U' ? 'único' : i.talle})`),
    })),
  };
}

const implementaciones = {
  resumen_ventas: ({ dias }) => M.resumen(M.normalizarDias(dias)),
  ventas_por_dia: ({ dias }) => ventasPorDiaOSemana(M.normalizarDias(dias)),
  productos_mas_vendidos: ({ dias, limite, categoria }) =>
    M.productosMasVendidos(M.normalizarDias(dias), { limite, categoria }).then((productos) => ({ productos })),
  ventas_por_categoria_y_talle: async ({ dias }) => {
    const d = M.normalizarDias(dias);
    const [por_categoria, por_talle] = await Promise.all([M.ventasPorCategoria(d), M.ventasPorTalle(d)]);
    return { por_categoria, por_talle };
  },
  medios_de_pago_y_entrega: async ({ dias }) => {
    const d = M.normalizarDias(dias);
    const [medios_pago, tipos_entrega] = await Promise.all([M.mediosDePago(d), M.tiposDeEntrega(d)]);
    return { medios_pago, tipos_entrega };
  },
  estado_del_stock: async () => {
    const [inventario, alertas, sin_ventas_30d] = await Promise.all([M.inventario(), M.alertasStock(), M.sinMovimiento(30)]);
    return { inventario, alertas: alertas.slice(0, 25), total_alertas: alertas.length, sin_ventas_30d };
  },
  buscar_pedidos: buscarPedidos,
};

export async function ejecutarHerramienta(nombre, args = {}) {
  if (!implementaciones[nombre]) return ejecutarCatalogo(nombre, args); // buscar_productos / ver_producto
  try {
    return { resultado: await implementaciones[nombre](args ?? {}) };
  } catch (err) {
    console.error(`[ia-admin] herramienta ${nombre} falló:`, err.message);
    return { resultado: { error: 'No se pudo consultar la base en este momento' } };
  }
}
