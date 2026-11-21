import { Router } from 'express';
import { conversar, chatDisponible } from '../chat/gemini.js';
import { HttpError } from '../constants.js';

const router = Router();

const MAX_MENSAJES = 12; // contexto que se manda al modelo
const MAX_LARGO = 600; // caracteres por mensaje

// Límite simple por IP para cuidar el consumo de la API key (en memoria, alcanza para la demo)
const LIMITE_POR_MINUTO = 15;
const pedidosPorIp = new Map();
function limitar(ip) {
  const ahora = Date.now();
  const recientes = (pedidosPorIp.get(ip) ?? []).filter((t) => ahora - t < 60_000);
  if (recientes.length >= LIMITE_POR_MINUTO) {
    throw new HttpError(429, 'Estás mandando muchos mensajes seguidos. Esperá un momento y probá de nuevo.');
  }
  recientes.push(ahora);
  pedidosPorIp.set(ip, recientes);
}

const MENSAJE_RESPALDO =
  'Ahora no puedo responder, perdón. Escribinos por WhatsApp y te atendemos enseguida.';

// GET /api/chat/estado -> el frontend decide si muestra el asistente
router.get('/estado', (_req, res) => {
  res.json({ disponible: chatDisponible() });
});

// POST /api/chat   body: { mensajes: [{ rol: 'user' | 'model', texto }] }
router.post('/', async (req, res) => {
  const { mensajes } = req.body ?? {};
  if (!Array.isArray(mensajes) || mensajes.length === 0) throw new HttpError(400, 'Faltan los mensajes');

  const historial = mensajes
    .filter((m) => (m?.rol === 'user' || m?.rol === 'model') && typeof m.texto === 'string' && m.texto.trim())
    .slice(-MAX_MENSAJES)
    .map((m) => ({ rol: m.rol, texto: m.texto.trim().slice(0, MAX_LARGO) }));

  // Gemini exige que la conversación arranque con el usuario y termine con su pregunta
  while (historial.length && historial[0].rol !== 'user') historial.shift();
  if (!historial.length || historial.at(-1).rol !== 'user') throw new HttpError(400, 'El último mensaje debe ser del cliente');

  if (!chatDisponible()) {
    return res.status(503).json({ respuesta: MENSAJE_RESPALDO, productoIds: [], modelo: 'sin-configurar' });
  }

  limitar(req.ip);

  try {
    res.json(await conversar(historial));
  } catch {
    // Los detalles ya quedaron en el log del servidor
    res.status(503).json({ respuesta: MENSAJE_RESPALDO, productoIds: [], modelo: 'respaldo' });
  }
});

export default router;
