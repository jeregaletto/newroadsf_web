import { useEffect, useRef, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Minus, Table2, ChartColumn } from 'lucide-react';

/** Ancho real de un contenedor (para gráficos SVG responsivos). */
export function useAncho() {
  const ref = useRef(null);
  const [ancho, setAncho] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setAncho(Math.round(e.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, ancho];
}

/**
 * Tarjeta de gráfico con su vista de tabla (equivalente accesible: ningún valor queda solo en el tooltip).
 * `tabla`: { columnas: string[], filas: (string|number)[][], alinear?: ('left'|'right')[] }
 */
export function ChartCard({ titulo, subtitulo, tabla, children, className = '', accion }) {
  const [verTabla, setVerTabla] = useState(false);
  return (
    <section className={`flex flex-col rounded-2xl border border-line bg-ink-2 p-4 sm:p-5 ${className}`}>
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-white">{titulo}</h3>
          {subtitulo && <p className="mt-0.5 text-xs text-muted">{subtitulo}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {accion}
          {tabla && (
            <button
              type="button"
              onClick={() => setVerTabla((v) => !v)}
              className="grid size-8 place-items-center rounded-lg text-muted transition hover:bg-white/5 hover:text-white"
              aria-pressed={verTabla}
              aria-label={verTabla ? `Ver gráfico: ${titulo}` : `Ver tabla: ${titulo}`}
              title={verTabla ? 'Ver gráfico' : 'Ver tabla'}
            >
              {verTabla ? <ChartColumn className="size-4" /> : <Table2 className="size-4" />}
            </button>
          )}
        </div>
      </header>
      {verTabla && tabla ? <TablaDatos {...tabla} titulo={titulo} /> : children}
    </section>
  );
}

function TablaDatos({ columnas, filas, alinear = [], titulo }) {
  return (
    <div className="max-h-80 overflow-auto rounded-xl border border-line">
      <table className="w-full text-sm">
        <caption className="sr-only">{titulo}</caption>
        <thead className="sticky top-0 bg-ink-3 text-xs text-muted">
          <tr>
            {columnas.map((c, i) => (
              <th key={c} scope="col" className={`px-3 py-2 font-semibold ${alinear[i] === 'right' ? 'text-right' : 'text-left'}`}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((f, i) => (
            <tr key={i} className="border-t border-line text-zinc-300">
              {f.map((v, j) => (
                <td key={j} className={`px-3 py-2 ${alinear[j] === 'right' ? 'text-right tabular-nums' : ''}`}>
                  {v}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Tooltip: el valor manda (fuerte), la etiqueta acompaña. Se ubica sobre (x, y) dentro del contenedor
 * relativo y se acomoda para no salirse de los bordes.
 */
export function Tooltip({ x, y, ancho, titulo, filas }) {
  const MEDIO = 88;
  const left = Math.min(Math.max(x, MEDIO), Math.max(ancho - MEDIO, MEDIO));
  return (
    <div
      role="status"
      className="pointer-events-none absolute z-10 w-max max-w-44 -translate-x-1/2 -translate-y-full rounded-xl border border-white/10 bg-[#1f1f1d] px-3 py-2 text-xs shadow-xl"
      style={{ left, top: y - 10 }}
    >
      {titulo && <p className="mb-1 text-[0.7rem] text-muted">{titulo}</p>}
      {filas.map((f) => (
        <p key={f.etiqueta} className="flex items-center gap-2 whitespace-nowrap">
          {f.color && <span className="h-0.5 w-3 shrink-0 rounded-full" style={{ background: f.color }} aria-hidden="true" />}
          <span className="font-bold text-white">{f.valor}</span>
          <span className="text-zinc-400">{f.etiqueta}</span>
        </p>
      ))}
    </div>
  );
}

/** Stat tile: etiqueta · valor (cifras proporcionales) · variación vs período anterior. */
export function StatTile({ icono: Icono, etiqueta, valor, variacion, ayuda, subeEsBueno = true }) {
  let delta = null;
  if (variacion === null || variacion === undefined) {
    delta = ayuda ? null : <span className="text-muted">Sin datos del período anterior</span>;
  } else {
    const sube = variacion > 0;
    const igual = variacion === 0;
    const bueno = igual ? null : sube === subeEsBueno;
    const Flecha = igual ? Minus : sube ? ArrowUpRight : ArrowDownRight;
    delta = (
      <span className={`inline-flex items-center gap-0.5 font-semibold ${bueno === null ? 'text-muted' : bueno ? 'text-st-good' : 'text-red-400'}`}>
        <Flecha className="size-3.5" aria-hidden="true" />
        {sube ? '+' : ''}
        {variacion.toLocaleString('es-AR', { maximumFractionDigits: 1 })}%
        <span className="ml-1 font-normal text-muted">
          vs. <span className="hidden sm:inline">período </span>anterior
        </span>
      </span>
    );
  }
  return (
    <div className="rounded-2xl border border-line bg-ink-2 p-4">
      <p className="flex items-center gap-2 text-xs font-medium text-zinc-400">
        {Icono && <Icono className="size-4 text-acid" aria-hidden="true" />}
        {etiqueta}
      </p>
      <p className="mt-2 whitespace-nowrap text-xl font-bold tracking-tight text-white sm:text-2xl lg:text-[1.7rem]">{valor}</p>
      <p className="mt-1 text-xs">{delta ?? <span className="text-muted">{ayuda}</span>}</p>
    </div>
  );
}
