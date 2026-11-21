import { Fragment, useEffect, useRef, useState } from 'react';
import { ArrowUp, RotateCcw, Sparkles } from 'lucide-react';
import Modal from './Modal';
import { WhatsAppIcon } from './BrandIcons';
import { api } from '../lib/api';
import { formatARS, imgUrl, onImgError } from '../lib/format';
import { waLink } from '../lib/whatsapp';

const STORAGE_KEY = 'newroad-chat-v1';
const BIENVENIDA = {
  rol: 'model',
  texto: '¡Hola! Soy el asistente de **New Road**. Preguntame por prendas, talles, stock, envíos o el horario del local.',
  local: true,
};

function cargarHistorial() {
  try {
    const data = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
    return Array.isArray(data) && data.length ? data : [BIENVENIDA];
  } catch {
    return [BIENVENIDA];
  }
}

/** Mini formateador: **negrita**, listas con "- " y saltos de línea (sin HTML crudo). */
function Texto({ texto }) {
  const inline = (linea) =>
    linea.split(/(\*\*[^*]+\*\*)/g).map((parte, i) =>
      parte.startsWith('**') && parte.endsWith('**') ? (
        <strong key={i} className="font-bold text-white">
          {parte.slice(2, -2)}
        </strong>
      ) : (
        <Fragment key={i}>{parte.replace(/\*/g, '')}</Fragment>
      ),
    );

  const bloques = [];
  // Evita que un precio se corte entre el signo y el número
  const limpio = texto.replace(/\$\s+(?=\d)/g, '$ ');
  for (const linea of limpio.split('\n')) {
    const item = linea.match(/^\s*[-*•]\s+(.*)/);
    if (item) {
      const ultimo = bloques.at(-1);
      if (ultimo?.tipo === 'lista') ultimo.items.push(item[1]);
      else bloques.push({ tipo: 'lista', items: [item[1]] });
    } else if (linea.trim()) {
      bloques.push({ tipo: 'p', texto: linea });
    }
  }

  return (
    <div className="space-y-2">
      {bloques.map((b, i) =>
        b.tipo === 'lista' ? (
          <ul key={i} className="space-y-1 pl-4">
            {b.items.map((it, j) => (
              <li key={j} className="list-disc marker:text-acid">
                {inline(it)}
              </li>
            ))}
          </ul>
        ) : (
          <p key={i}>{inline(b.texto)}</p>
        ),
      )}
    </div>
  );
}

/** Tarjetas de los productos que el asistente nombró en su respuesta. */
function ProductosMencionados({ ids, texto, productos, onOpenProduct }) {
  const t = texto.toLowerCase();
  const lista = (ids ?? [])
    .map((id) => productos.find((p) => p.id === id))
    .filter((p) => p && t.includes(p.nombre.toLowerCase()))
    .slice(0, 4);
  if (!lista.length) return null;

  return (
    <div className="mt-2 flex flex-col gap-2">
      {lista.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onOpenProduct(p)}
          className="flex w-full min-w-0 items-center gap-3 rounded-xl border border-line bg-ink-3 p-2 text-left transition hover:border-acid"
        >
          <img src={imgUrl(p.imagen_url, 120)} onError={onImgError} alt="" className="size-12 shrink-0 rounded-lg object-cover" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-white">{p.nombre}</span>
            <span className="font-display text-base text-acid">{formatARS(p.precio)}</span>
          </span>
          <span className="shrink-0 rounded-full bg-acid px-3 py-1 text-xs font-bold text-ink">Ver</span>
        </button>
      ))}
    </div>
  );
}

export default function ChatAssistant({ open, onClose, productos, onOpenProduct }) {
  const [mensajes, setMensajes] = useState(cargarHistorial);
  const [texto, setTexto] = useState('');
  const [pensando, setPensando] = useState(false);
  const listaRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(mensajes));
  }, [mensajes]);

  // Auto-scroll al último mensaje
  useEffect(() => {
    if (open) listaRef.current?.scrollTo({ top: listaRef.current.scrollHeight, behavior: 'smooth' });
  }, [mensajes, pensando, open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const enviar = async (contenido) => {
    const pregunta = contenido.trim();
    if (!pregunta || pensando) return;
    const nuevos = [...mensajes, { rol: 'user', texto: pregunta }];
    setMensajes(nuevos);
    setTexto('');
    setPensando(true);
    try {
      const historial = nuevos.filter((m) => !m.local && !m.error).map(({ rol, texto: t }) => ({ rol, texto: t }));
      const r = await api.chat(historial);
      setMensajes((prev) => [...prev, { rol: 'model', texto: r.respuesta, productoIds: r.productoIds }]);
    } catch (err) {
      setMensajes((prev) => [
        ...prev,
        { rol: 'model', texto: err.data?.respuesta ?? err.message, error: true },
      ]);
    } finally {
      setPensando(false);
    }
  };

  const reiniciar = () => setMensajes([BIENVENIDA]);
  const soloBienvenida = mensajes.length === 1;

  return (
    <Modal
      open={open}
      onClose={onClose}
      variant="drawer"
      title="Asistente New Road"
      headerExtra={
        !soloBienvenida && (
          <button
            type="button"
            onClick={reiniciar}
            className="ml-auto grid size-10 place-items-center rounded-full text-zinc-500 hover:bg-white/10 hover:text-white"
            aria-label="Empezar una conversación nueva"
            title="Nueva conversación"
          >
            <RotateCcw className="size-4" />
          </button>
        )
      }
    >
      <div ref={listaRef} className="flex-1 space-y-4 overflow-y-auto overscroll-contain p-4" aria-live="polite">
        {mensajes.map((m, i) =>
          m.rol === 'user' ? (
            <div key={i} className="flex justify-end">
              <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-acid px-4 py-2.5 text-sm font-medium text-ink">
                {m.texto}
              </p>
            </div>
          ) : (
            <div key={i} className="flex gap-2.5">
              <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-ink-3">
                <Sparkles className="size-4 text-acid" />
              </span>
              <div className="min-w-0 max-w-[85%]">
                <div
                  className={`rounded-2xl rounded-tl-md px-4 py-2.5 text-sm leading-relaxed ${
                    m.error ? 'border border-orange-500/40 bg-orange-500/10 text-orange-200' : 'bg-ink-3 text-zinc-300'
                  }`}
                >
                  <Texto texto={m.texto} />
                  {m.error && (
                    <a
                      href={waLink('¡Hola New Road! Quería hacer una consulta.')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1.5 font-bold text-wa"
                    >
                      <WhatsAppIcon className="size-4" /> Escribir por WhatsApp
                    </a>
                  )}
                </div>
                {m.productoIds && (
                  <ProductosMencionados ids={m.productoIds} texto={m.texto} productos={productos} onOpenProduct={onOpenProduct} />
                )}
              </div>
            </div>
          ),
        )}

        {pensando && (
          <div className="flex gap-2.5" aria-label="El asistente está escribiendo">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-ink-3">
              <Sparkles className="size-4 animate-pulse text-acid" />
            </span>
            <div className="flex items-center gap-1 rounded-2xl rounded-tl-md bg-ink-3 px-4 py-3">
              {[0, 150, 300].map((d) => (
                <span key={d} className="size-1.5 animate-bounce rounded-full bg-zinc-500" style={{ animationDelay: `${d}ms` }} />
              ))}
            </div>
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          enviar(texto);
        }}
        className="border-t border-line bg-ink p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        <div className="flex items-end gap-2">
          <label className="flex-1">
            <span className="sr-only">Escribí tu consulta</span>
            <textarea
              ref={inputRef}
              rows={1}
              value={texto}
              maxLength={500}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  enviar(texto);
                }
              }}
              placeholder="Escribí tu consulta…"
              enterKeyHint="send"
              className="block max-h-32 min-h-12 w-full resize-none rounded-2xl border border-line bg-ink-2 px-4 py-3 text-base text-white placeholder:text-zinc-500 [field-sizing:content] focus:border-acid focus:outline-none"
            />
          </label>
          <button
            type="submit"
            disabled={!texto.trim() || pensando}
            className="grid size-12 shrink-0 place-items-center rounded-2xl bg-acid text-ink transition hover:bg-acid-deep active:scale-95 disabled:bg-ink-3 disabled:text-zinc-600"
            aria-label="Enviar"
          >
            <ArrowUp className="size-5" strokeWidth={2.5} />
          </button>
        </div>
        <p className="mt-2 text-center text-[0.65rem] text-zinc-600">
          Asistente con IA · precios y stock consultados en tiempo real
        </p>
      </form>
    </Modal>
  );
}
