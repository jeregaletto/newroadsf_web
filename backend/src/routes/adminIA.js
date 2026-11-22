// IA del panel admin: asistente de gestión (ventas y stock) + generador de descripciones.
// Todas las rutas requieren sesión de admin.
import { Router } from 'express';
import { requireAdmin } from '../auth.js';
import { HttpError, CATEGORIAS } from '../constants.js';
import { conversar, generarTexto, chatDisponible } from '../chat/gemini.js';
import { systemPromptAdmin, INSTRUCCION_DESCRIPCION } from '../chat/adminPrompt.js';
import { declaraciones, ejecutarHerramienta } from '../chat/adminTools.js';

const router = Router();
router.use(requireAdmin);

// El dueño puede esperar un poco más que un cliente: margen mayor ante picos de demanda de Google
const CONFIG_ADMIN = {
  systemPrompt: systemPromptAdmin,
  declaraciones,
  ejecutar: ejecutarHerramienta,
  timeoutTotalMs: 45000,
  timeoutPorLlamadaMs: 20000,
};
const MAX_MENSAJES = 16;
const MAX_LARGO = 800;

// Límite por IP (más holgado que el público: lo usan 1 o 2 personas)
const LIMITE_POR_MINUTO = 30;
const usos = new Map();
function limitar(ip) {
  const ahora = Date.now();
  const recientes = (usos.get(ip) ?? []).filter((t) => ahora - t < 60_000);
  if (recientes.length >= LIMITE_POR_MINUTO) throw new HttpError(429, 'Demasiadas consultas seguidas. Esperá un momento.');
  recientes.push(ahora);
  usos.set(ip, recientes);
}

function requiereIA() {
  if (!chatDisponible()) throw new HttpError(503, 'La IA no está configurada (falta GEMINI_API_KEY en backend/.env).');
}

// GET /api/admin/ia/estado
router.get('/estado', (_req, res) => res.json({ disponible: chatDisponible() }));

// POST /api/admin/ia/chat   body: { mensajes: [{ rol, texto }] }
router.post('/chat', async (req, res) => {
  requiereIA();
  const { mensajes } = req.body ?? {};
  if (!Array.isArray(mensajes) || !mensajes.length) throw new HttpError(400, 'Faltan los mensajes');

  const historial = mensajes
    .filter((m) => (m?.rol === 'user' || m?.rol === 'model') && typeof m.texto === 'string' && m.texto.trim())
    .slice(-MAX_MENSAJES)
    .map((m) => ({ rol: m.rol, texto: m.texto.trim().slice(0, MAX_LARGO) }));
  while (historial.length && historial[0].rol !== 'user') historial.shift();
  if (!historial.length || historial.at(-1).rol !== 'user') throw new HttpError(400, 'El último mensaje debe ser tuyo');

  limitar(req.ip);
  try {
    res.json(await conversar(historial, CONFIG_ADMIN));
  } catch {
    res.status(503).json({ respuesta: 'El asistente no está disponible en este momento. Probá de nuevo en unos segundos.', modelo: 'respaldo' });
  }
});

// POST /api/admin/ia/descripcion   body: { nombre, categoria, detalles? }
router.post('/descripcion', async (req, res) => {
  requiereIA();
  const { nombre, categoria, detalles } = req.body ?? {};
  if (!nombre?.trim()) throw new HttpError(400, 'Escribí primero el nombre del producto');
  limitar(req.ip);

  const pedido = [
    `Producto: ${String(nombre).trim().slice(0, 120)}`,
    CATEGORIAS.includes(categoria) ? `Categoría: ${categoria}` : '',
    detalles?.trim() ? `Notas del vendedor: ${String(detalles).trim().slice(0, 400)}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const { texto, modelo } = await generarTexto(INSTRUCCION_DESCRIPCION, pedido);
    res.json({ descripcion: texto.replace(/^["“]|["”]$/g, '').slice(0, 600), modelo });
  } catch {
    throw new HttpError(503, 'No se pudo generar la descripción. Probá de nuevo.');
  }
});

export default router;
