import { talleLabel } from '../lib/constants';

/** Botonera de talles: los que no tienen stock aparecen tachados y deshabilitados. */
export default function SizePicker({ talles, value, onChange, size = 'sm', showStock = false }) {
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
            className={`relative flex flex-col items-center justify-center rounded-xl border font-bold transition active:scale-95 ${
              size === 'sm' ? 'h-9 min-w-9 px-2 text-xs' : 'h-14 min-w-16 px-3 text-sm'
            } ${
              sinStock
                ? 'cursor-not-allowed border-line/60 text-zinc-600 line-through'
                : activo
                  ? 'border-acid bg-acid text-ink'
                  : 'border-line bg-ink-3 text-zinc-200 hover:border-zinc-500'
            }`}
          >
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
