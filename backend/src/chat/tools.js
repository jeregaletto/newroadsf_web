// Herramientas (Function Calling) que Gemini puede usar para consultar el catálogo EN VIVO.
// Todas son de solo lectura: el chatbot nunca modifica precios, stock ni pedidos.
import { pool } from '../db.js';
import { CATEGORIAS, TALLES } from '../constants.js';

const ORDEN_TALLES = `FIELD(t.talle, ${TALLES.map((t) => `'${t}'`).join(',')})`;
const MAX_RESULTADOS = 8;

export const declaraciones = [
  {
    name: 'buscar_productos',
    description:
      'Busca prendas del catálogo de New Road con precio y stock ACTUAL por talle. ' +
      'Usala siempre que el cliente pregunte por productos, precios, talles, stock, colores o recomendaciones. ' +
      'Todos los filtros son opcionales; sin filtros devuelve el catálogo completo.',
    parameters: {
      type: 'OBJECT',
      properties: {
        texto: {
          type: 'STRING',
          description: 'Palabras clave del nombre o descripción (ej: "jean", "hoodie", "negra", "oversize").',
        },
        categoria: { type: 'STRING', enum: CATEGORIAS, description: 'Categoría de la prenda.' },
        talle: {
          type: 'STRING',
          enum: TALLES,
          description: 'Solo devuelve productos con stock en este talle. "U" es talle único (accesorios).',
        },
        precio_max: { type: 'NUMBER', description: 'Precio máximo en pesos argentinos.' },
      },
    },
  },
  {
    name: 'ver_producto',
    description: 'Devuelve el detalle completo de un producto (descripción, precio y stock por talle) por su id.',
    parameters: {
      type: 'OBJECT',
      properties: { producto_id: { type: 'INTEGER', description: 'Id del producto, obtenido con buscar_productos.' } },
      required: ['producto_id'],
    },
  },
];

async function tallesDe(ids) {
  if (!ids.length) return new Map();
  const [rows] = await pool.query(
    `SELECT t.producto_id, t.talle, t.stock FROM producto_talles t
      WHERE t.producto_id IN (?) ORDER BY t.producto_id, ${ORDEN_TALLES}`,
    [ids],
  );
  const map = new Map(ids.map((id) => [id, []]));
  for (const r of rows) map.get(r.producto_id).push({ talle: r.talle === 'U' ? 'Único' : r.talle, stock: r.stock });
  return map;
}

async function buscarProductos({ texto, categoria, talle, precio_max } = {}) {
  const where = ['p.activo = 1'];
  const params = [];

  if (categoria && CATEGORIAS.includes(categoria)) {
    where.push('p.categoria = ?');
    params.push(categoria);
  }
  if (talle && TALLES.includes(talle)) {
    where.push('EXISTS (SELECT 1 FROM producto_talles x WHERE x.producto_id = p.id AND x.talle = ? AND x.stock > 0)');
    params.push(talle);
  }
  if (Number(precio_max) > 0) {
    where.push('p.precio <= ?');
    params.push(Number(precio_max));
  }
  if (texto?.trim()) {
    // Cada palabra debe aparecer en nombre, descripción o categoría
    for (const palabra of texto.trim().split(/\s+/).slice(0, 5)) {
      where.push('CONCAT_WS(" ", p.nombre, p.descripcion, p.categoria) LIKE ?');
      params.push(`%${palabra}%`);
    }
  }

  const [rows] = await pool.query(
    `SELECT p.id, p.nombre, p.categoria, p.precio FROM productos p
      WHERE ${where.join(' AND ')}
      ORDER BY p.destacado DESC, p.precio ASC LIMIT ${MAX_RESULTADOS}`,
    params,
  );
  // Sin resultados por texto: devolvemos alternativas reales con los demás filtros
  if (rows.length === 0 && texto?.trim()) {
    const alt = await buscarProductos({ categoria, talle, precio_max });
    return {
      cantidad: 0,
      productos: [],
      nota: `No existe ningún producto que coincida con "${texto}". Estas son alternativas reales del catálogo:`,
      alternativas: alt.productos.slice(0, 4),
    };
  }

  const talles = await tallesDe(rows.map((r) => r.id));

  return {
    cantidad: rows.length,
    productos: rows.map((r) => {
      const t = talles.get(r.id);
      return {
        id: r.id,
        nombre: r.nombre,
        categoria: r.categoria,
        precio_ars: r.precio,
        talles_con_stock: t.filter((x) => x.stock > 0),
        talles_agotados: t.filter((x) => x.stock === 0).map((x) => x.talle),
      };
    }),
  };
}

async function verProducto({ producto_id } = {}) {
  const [rows] = await pool.query(
    'SELECT id, nombre, categoria, descripcion, precio FROM productos WHERE id = ? AND activo = 1',
    [Number(producto_id)],
  );
  if (!rows.length) return { error: 'Producto no encontrado' };
  const p = rows[0];
  const talles = (await tallesDe([p.id])).get(p.id);
  return { id: p.id, nombre: p.nombre, categoria: p.categoria, descripcion: p.descripcion, precio_ars: p.precio, stock_por_talle: talles };
}

const implementaciones = { buscar_productos: buscarProductos, ver_producto: verProducto };

/** Ejecuta una herramienta y devuelve { resultado, productoIds } */
export async function ejecutarHerramienta(nombre, args) {
  const fn = implementaciones[nombre];
  if (!fn) return { resultado: { error: `Herramienta desconocida: ${nombre}` }, productoIds: [] };
  try {
    const resultado = await fn(args ?? {});
    const lista = [...(resultado.productos ?? []), ...(resultado.alternativas ?? [])];
    const productoIds = lista.length ? lista.map((p) => p.id) : resultado.id ? [resultado.id] : [];
    return { resultado, productoIds };
  } catch (err) {
    console.error(`[chat] herramienta ${nombre} falló:`, err.message);
    return { resultado: { error: 'No se pudo consultar el catálogo en este momento' }, productoIds: [] };
  }
}
