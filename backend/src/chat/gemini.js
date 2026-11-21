// Conversación con Gemini (API REST) + Function Calling contra MySQL.
// Cadena de respaldo de modelos y timeouts inspirada en rag_udi/rag.mjs.
import { declaraciones, ejecutarHerramienta } from './tools.js';
import { systemPrompt } from './prompt.js';

const API = 'https://generativelanguage.googleapis.com/v1beta/models';
const MAX_RONDAS_HERRAMIENTAS = 4;
const TIMEOUT_POR_LLAMADA = Number(process.env.GEMINI_TIMEOUT_MS ?? 15000);
const TIMEOUT_TOTAL = Number(process.env.GEMINI_TIMEOUT_TOTAL_MS ?? 30000);

const modelos = () =>
  (process.env.GEMINI_MODELS ?? 'gemini-3.5-flash-lite,gemini-3.5-flash')
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean);

export const chatDisponible = () => Boolean(process.env.GEMINI_API_KEY);

class GeminiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function generar(modelo, contents, timeoutMs) {
  let res;
  try {
    res = await fetch(`${API}/${modelo}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt() }] },
        contents,
        tools: [{ functionDeclarations: declaraciones }],
        generationConfig: { maxOutputTokens: 1024 },
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    throw new GeminiError(err.name === 'TimeoutError' ? 'timeout' : err.message);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new GeminiError(data.error?.message ?? `HTTP ${res.status}`, res.status);
  const content = data.candidates?.[0]?.content;
  if (!content?.parts?.length) throw new GeminiError(`respuesta vacía (${data.candidates?.[0]?.finishReason ?? 'sin candidato'})`);
  return content;
}

/** Corre la conversación completa con un modelo, resolviendo las llamadas a herramientas. */
async function conversarCon(modelo, historial, deadline) {
  const contents = historial.map((m) => ({ role: m.rol, parts: [{ text: m.texto }] }));
  const productoIds = new Set();

  for (let ronda = 0; ronda <= MAX_RONDAS_HERRAMIENTAS; ronda++) {
    const restante = deadline - Date.now();
    if (restante < 1500) throw new GeminiError('timeout total');

    const content = await generar(modelo, contents, Math.min(TIMEOUT_POR_LLAMADA, restante));
    // Se devuelve tal cual (incluye thoughtSignature, requerida por Gemini 3 en el turno siguiente)
    contents.push({ role: 'model', parts: content.parts });

    const llamadas = content.parts.filter((p) => p.functionCall);
    if (llamadas.length === 0) {
      const texto = content.parts.map((p) => p.text ?? '').join('').trim();
      if (!texto) throw new GeminiError('respuesta sin texto');
      return { respuesta: texto, productoIds: [...productoIds] };
    }

    const respuestas = [];
    for (const { functionCall: fc } of llamadas) {
      const { resultado, productoIds: ids } = await ejecutarHerramienta(fc.name, fc.args);
      ids.forEach((id) => productoIds.add(id));
      respuestas.push({ functionResponse: { id: fc.id, name: fc.name, response: resultado } });
    }
    contents.push({ role: 'user', parts: respuestas });
  }
  throw new GeminiError('demasiadas llamadas a herramientas');
}

/**
 * @param historial [{ rol: 'user' | 'model', texto }]  (el último es la pregunta del cliente)
 * @returns { respuesta, productoIds, modelo }
 */
export async function conversar(historial) {
  const deadline = Date.now() + TIMEOUT_TOTAL;
  let ultimoError;

  for (const modelo of modelos()) {
    try {
      const r = await conversarCon(modelo, historial, deadline);
      return { ...r, modelo };
    } catch (err) {
      ultimoError = err;
      console.error(`[chat] ${modelo} falló:`, err.message);
      // Key inválida o sin permisos: no tiene sentido probar otros modelos
      if (err.status === 401 || err.status === 403) break;
      if (Date.now() > deadline - 1500) break;
    }
  }
  throw ultimoError ?? new GeminiError('sin modelos configurados');
}
