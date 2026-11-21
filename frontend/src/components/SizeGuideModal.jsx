import { useState } from 'react';
import { Ruler, Sparkles } from 'lucide-react';
import Modal from './Modal';
import { WhatsAppIcon } from './BrandIcons';
import { SIZE_GUIDE, sugerirTalle } from '../lib/sizeGuide';
import { waLink } from '../lib/whatsapp';

const TABS = Object.entries(SIZE_GUIDE).map(([id, g]) => ({ id, titulo: g.titulo }));

function Guia({ inicial }) {
  const [tab, setTab] = useState(inicial ?? 'remeras');
  const [medida, setMedida] = useState('');
  const [resaltado, setResaltado] = useState(null);
  const guia = SIZE_GUIDE[tab];
  const sugerencia = sugerirTalle(tab, medida);
  const activo = sugerencia?.talle ?? resaltado;

  return (
    <div className="space-y-5 p-5 sm:p-6">
      <div className="grid grid-cols-3 gap-1 rounded-2xl border border-line bg-ink-3 p-1" role="tablist" aria-label="Tipo de prenda">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => {
              setTab(t.id);
              setMedida('');
              setResaltado(null);
            }}
            className={`h-10 rounded-xl text-xs font-bold transition sm:text-sm ${
              tab === t.id ? 'bg-acid text-ink' : 'text-zinc-400 hover:text-white'
            }`}
          >
            {t.titulo}
          </button>
        ))}
      </div>

      {/* Calculadora */}
      <div className="rounded-2xl border border-acid/30 bg-acid/5 p-4">
        <p className="flex items-center gap-2 text-sm font-bold text-white">
          <Sparkles className="size-4 text-acid" /> ¿Qué talle soy?
        </p>
        <p className="mt-1 text-xs text-zinc-400">{guia.calculadora.ayuda}</p>
        <div className="mt-3 flex items-end gap-3">
          <label className="relative flex-1">
            <span className="mb-1 block text-xs font-semibold text-zinc-300">{guia.calculadora.label} (cm)</span>
            <input
              type="number"
              inputMode="numeric"
              min="50"
              max="160"
              value={medida}
              onChange={(e) => setMedida(e.target.value)}
              placeholder={tab === 'pantalones' ? 'Ej: 84' : 'Ej: 98'}
              className="h-12 w-full rounded-xl border border-line bg-ink-2 px-4 pr-12 text-base text-white placeholder:text-zinc-500 focus:border-acid focus:outline-none"
            />
            <span className="pointer-events-none absolute bottom-3.5 right-4 text-sm text-zinc-500">cm</span>
          </label>
          <div
            className={`grid h-12 min-w-20 place-items-center rounded-xl px-3 font-display text-2xl transition ${
              sugerencia ? 'bg-acid text-ink' : 'border border-dashed border-line text-zinc-600'
            }`}
            aria-live="polite"
            aria-label={sugerencia ? `Talle sugerido ${sugerencia.talle}` : 'Sin talle sugerido'}
          >
            {sugerencia?.talle ?? '—'}
          </div>
        </div>
        {sugerencia?.aviso && <p className="mt-2 text-xs text-orange-300">{sugerencia.aviso}</p>}
      </div>

      {/* Tabla */}
      <div>
        <div className="overflow-x-auto rounded-2xl border border-line">
          <table className="w-full min-w-[22rem] text-sm">
            <caption className="sr-only">Medidas de {guia.titulo} en centímetros</caption>
            <thead className="bg-ink-3 text-xs uppercase tracking-wider text-zinc-500">
              <tr>
                {guia.columnas.map((c) => (
                  <th key={c} scope="col" className="px-3 py-3 text-left font-semibold first:pl-4">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {guia.filas.map((f) => {
                const on = activo === f.talle;
                return (
                  <tr
                    key={f.talle}
                    onClick={() => setResaltado(f.talle)}
                    className={`cursor-pointer border-t border-line transition ${on ? 'bg-acid text-ink' : 'text-zinc-300 hover:bg-white/5'}`}
                  >
                    <th scope="row" className={`py-3 pl-4 pr-3 text-left font-display text-lg ${on ? 'text-ink' : 'text-white'}`}>
                      {f.talle}
                    </th>
                    {f.medidas.map((m, i) => (
                      <td key={i} className="px-3 py-3 tabular-nums">
                        {m}
                        {/* La columna "Equiv." de pantalones es talle numérico, no cm */}
                        {!(tab === 'pantalones' && i === 0) && <span className={on ? 'text-ink/60' : 'text-zinc-600'}> cm</span>}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 flex items-start gap-2 text-xs text-zinc-500">
          <Ruler className="mt-0.5 size-3.5 shrink-0" />
          {guia.nota} Medidas de la prenda apoyada en plano; pueden variar ±1,5 cm.
        </p>
      </div>

      <a
        href={waLink('¡Hola New Road! Tengo una duda con los talles, ¿me ayudan?')}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-12 items-center justify-center gap-2 rounded-xl border border-line text-sm font-semibold text-white transition hover:bg-white/5"
      >
        <WhatsAppIcon className="size-4 text-wa" /> ¿Dudas? Te asesoramos por WhatsApp
      </a>
    </div>
  );
}

export default function SizeGuideModal({ open, tipo, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title="Guía de talles" size="md">
      {open && <Guia key={tipo ?? 'remeras'} inicial={tipo} />}
    </Modal>
  );
}
