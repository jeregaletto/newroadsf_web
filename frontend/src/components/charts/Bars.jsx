import { useRef, useState } from 'react';
import { Tooltip, useAncho } from './base';

/** Tooltip anclado al elemento enfocado o con hover, relativo al contenedor. */
function useTooltipEn(contenedorRef) {
  const [tip, setTip] = useState(null);
  const mostrar = (el, contenido) => {
    const c = contenedorRef.current?.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    if (!c) return;
    setTip({ x: r.left - c.left + r.width / 2, y: r.top - c.top, ancho: c.width, ...contenido });
  };
  return [tip, mostrar, () => setTip(null)];
}

/**
 * Barras horizontales ordenadas (una sola serie, un solo color).
 * items: [{ id, etiqueta, valor, texto, detalle?: [{ valor, etiqueta }] }]
 * Valor en la punta de la barra; el tooltip suma el detalle.
 */
export function BarList({ items, nombreValor = '', vacio = 'Sin datos en el período' }) {
  const ref = useRef(null);
  const [tip, mostrar, ocultar] = useTooltipEn(ref);
  if (!items.length) return <p className="py-8 text-center text-sm text-muted">{vacio}</p>;
  const max = Math.max(...items.map((i) => i.valor), 1);

  return (
    <div ref={ref} className="relative">
      <ul className="space-y-3">
        {items.map((it) => {
          const pct = (it.valor / max) * 100;
          const contenido = {
            titulo: it.etiqueta,
            filas: [{ valor: it.texto, etiqueta: nombreValor, color: 'var(--color-viz)' }, ...(it.detalle ?? [])],
          };
          return (
            <li
              key={it.id ?? it.etiqueta}
              tabIndex={0}
              className="group -mx-2 cursor-default rounded-lg px-2 py-1 outline-none transition hover:bg-white/[0.03] focus-visible:outline-2 focus-visible:outline-acid"
              aria-label={`${it.etiqueta}: ${it.texto} ${nombreValor}${(it.detalle ?? []).map((d) => `, ${d.valor} ${d.etiqueta}`).join('')}`}
              onPointerEnter={(e) => mostrar(e.currentTarget, contenido)}
              onPointerLeave={ocultar}
              onFocus={(e) => mostrar(e.currentTarget, contenido)}
              onBlur={ocultar}
            >
              <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate text-zinc-300">{it.etiqueta}</span>
                <span className="shrink-0 font-semibold tabular-nums text-white">{it.texto}</span>
              </div>
              <div className="h-2.5 w-full" aria-hidden="true">
                {/* extremo de datos redondeado (4px), recto contra la línea base */}
                <div
                  className="h-full rounded-r-[4px] bg-viz transition-[filter] group-hover:brightness-125"
                  style={{ width: `${Math.max(pct, 1)}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
      {tip && <Tooltip {...tip} />}
    </div>
  );
}

/**
 * Columnas en orden natural (ej. talles S → XXL). Valor sobre cada columna (son pocas).
 * items: [{ etiqueta, valor, texto }]
 */
export function ColumnChart({ items, alto = 150, nombreValor = '' }) {
  const ref = useRef(null);
  const [tip, mostrar, ocultar] = useTooltipEn(ref);
  if (!items.length) return <p className="py-8 text-center text-sm text-muted">Sin datos en el período</p>;
  const max = Math.max(...items.map((i) => i.valor), 1);
  const total = items.reduce((a, i) => a + i.valor, 0);

  return (
    <div ref={ref} className="relative">
      <div className="flex items-end justify-around gap-1 border-b border-axis" style={{ height: alto + 22 }}>
        {items.map((it) => {
          const h = Math.max((it.valor / max) * alto, it.valor > 0 ? 3 : 0);
          const share = total ? Math.round((it.valor / total) * 100) : 0;
          const contenido = {
            titulo: `Talle ${it.etiqueta}`,
            filas: [
              { valor: it.texto, etiqueta: nombreValor, color: 'var(--color-viz)' },
              { valor: `${share}%`, etiqueta: 'del total' },
            ],
          };
          return (
            <div
              key={it.etiqueta}
              tabIndex={0}
              className="group flex h-full min-w-0 flex-1 cursor-default flex-col items-center justify-end rounded-t-md outline-none hover:bg-white/[0.03] focus-visible:outline-2 focus-visible:outline-acid"
              aria-label={`Talle ${it.etiqueta}: ${it.texto} ${nombreValor}, ${share}% del total`}
              onPointerEnter={(e) => mostrar(e.currentTarget.lastElementChild, contenido)}
              onPointerLeave={ocultar}
              onFocus={(e) => mostrar(e.currentTarget.lastElementChild, contenido)}
              onBlur={ocultar}
            >
              <span className="mb-1 text-xs font-semibold tabular-nums text-zinc-200">{it.texto}</span>
              <div className="w-full max-w-6 rounded-t-[4px] bg-viz transition-[filter] group-hover:brightness-125" style={{ height: h }} />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-around gap-1" aria-hidden="true">
        {items.map((it) => (
          <span key={it.etiqueta} className="flex-1 text-center text-xs font-semibold text-muted">
            {it.etiqueta}
          </span>
        ))}
      </div>
      {tip && <Tooltip {...tip} />}
    </div>
  );
}

const COLORES_CAT = ['var(--color-cat-1)', 'var(--color-cat-2)', 'var(--color-cat-3)'];

/**
 * Barra segmentada alta (una parte de un todo, ≤ 3 partes acá). Cada bloque muestra su %
 * si entra; la leyenda nombra las partes en el mismo orden. El color sigue a la categoría
 * (orden fijo por `orden`), no al ranking.
 * partes: [{ clave, etiqueta, valor, texto }]
 */
export function SegmentedBar({ partes, orden, titulo }) {
  const ref = useRef(null);
  const [refAncho, ancho] = useAncho();
  const [tip, mostrar, ocultar] = useTooltipEn(ref);
  const total = partes.reduce((a, p) => a + p.valor, 0);
  if (!total) return <p className="py-4 text-center text-sm text-muted">Sin datos en el período</p>;

  // Orden y color fijos por categoría
  const ordenadas = orden.map((clave) => partes.find((p) => p.clave === clave)).filter((p) => p && p.valor > 0);
  const color = (clave) => COLORES_CAT[orden.indexOf(clave)];

  return (
    <div ref={ref} className="relative">
      <div ref={refAncho} className="flex h-7 w-full gap-0.5" role="img" aria-label={`${titulo}: ${ordenadas.map((p) => `${p.etiqueta} ${Math.round((p.valor / total) * 100)}%`).join(', ')}`}>
        {ordenadas.map((p) => {
          const share = p.valor / total;
          const entra = share * ancho > 44;
          const contenido = {
            titulo: p.etiqueta,
            filas: [
              { valor: `${Math.round(share * 100)}%`, etiqueta: 'del total', color: color(p.clave) },
              { valor: p.texto, etiqueta: '' },
            ],
          };
          return (
            <div
              key={p.clave}
              tabIndex={0}
              className="flex h-full min-w-0 cursor-default items-center rounded-[4px] px-2 outline-none transition-[filter] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-acid"
              style={{ width: `${share * 100}%`, background: color(p.clave) }}
              onPointerEnter={(e) => mostrar(e.currentTarget, contenido)}
              onPointerLeave={ocultar}
              onFocus={(e) => mostrar(e.currentTarget, contenido)}
              onBlur={ocultar}
            >
              {entra && <span className="text-xs font-bold text-white">{Math.round(share * 100)}%</span>}
            </div>
          );
        })}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
        {ordenadas.map((p) => (
          <li key={p.clave} className="flex items-center gap-1.5 text-zinc-300">
            <span className="size-2.5 rounded-[3px]" style={{ background: color(p.clave) }} aria-hidden="true" />
            {p.etiqueta}
            <span className="text-muted">· {p.texto}</span>
          </li>
        ))}
      </ul>
      {tip && <Tooltip {...tip} />}
    </div>
  );
}
