import { useEffect, useRef } from 'react';
import { m } from 'motion/react';
import { talleLabel } from '../lib/constants';
import { indicadorTalle } from '../lib/motion';

/** Botonera de talles: los que no tienen stock aparecen tachados y deshabilitados. */
export default function SizePicker({ talles, value, onChange, size = 'sm', showStock = false }) {
  // El indicador del talle elegido aparece con scale + fade. No se usa layoutId (deslizarse entre
  // talles): requiere el paquete domMax de Motion (~18 KB gzip más) y además, al viajar, pasaría
  // por encima de las etiquetas de los talles vecinos.
  // Primer render (ej. talle preseleccionado): sin animación. Después, cada elección anima.
  const montado = useRef(false);
  useEffect(() => {
    montado.current = true;
  }, []);

  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Elegí talle">
      {talles.map(({ talle, stock }) => {
        const sinStock = stock <= 0;
        const activo = value === talle;
        return (
          <button
            key={talle}
            type="button"
            role="radio"
            aria-checked={activo}
            disabled={sinStock}
            onClick={() => onChange(talle)}
            title={sinStock ? 'Sin stock' : `${stock} disponibles`}
            className={`relative isolate flex flex-col items-center justify-center rounded-xl border font-bold transition-colors ${
              size === 'sm' ? 'h-9 min-w-9 px-2 text-xs' : 'h-14 min-w-16 px-3 text-sm'
            } ${
              sinStock
                ? 'cursor-not-allowed border-line/60 text-zinc-600 line-through'
                : activo
                  ? 'border-acid text-ink'
                  : 'border-line bg-ink-3 text-zinc-200 hover:border-zinc-500'
            }`}
          >
            {activo && (
              <m.span
                className="absolute inset-0 -z-10 rounded-[11px] bg-acid"
                variants={indicadorTalle}
                initial={montado.current ? 'oculto' : false}
                animate="visible"
                aria-hidden="true"
              />
            )}
            {talleLabel(talle)}
            {showStock && (
              <span className={`text-[0.65rem] font-medium no-underline ${activo ? 'text-ink/70' : sinStock ? 'text-zinc-600' : stock <= 2 ? 'text-orange-400' : 'text-zinc-500'}`}>
                {sinStock ? 'agotado' : stock <= 2 ? `¡quedan ${stock}!` : `${stock} disp.`}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
